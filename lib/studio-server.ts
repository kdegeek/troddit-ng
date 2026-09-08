import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import { createInterface } from "readline";
import { mkdirSync, existsSync } from "fs";
import path from "path";
import { randomBytes } from "crypto";
import {
  StudioRequest,
  studioPrompt,
  resultSchema,
  validateResult,
} from "./studio";

// One private worker per Node process. No generic RPC endpoint is exposed.
export class StudioWorker {
  private child?: ChildProcessWithoutNullStreams;
  private ready?: Promise<void>;
  private sequence = 0;
  private pending = new Map<
    number,
    {
      resolve: (value: any) => void;
      reject: (error: Error) => void;
      timer: NodeJS.Timeout;
    }
  >();
  private onEvent?: (method: string, params: any) => void;
  private workdir = "";
  private loginId?: string;
  private loginExpires = 0;
  private loginError?: string;
  private statusAt = 0;
  private cached: any;
  private jobTimer?: NodeJS.Timeout;
  login?: { verificationUrl: string; userCode: string };
  job?: {
    id: string;
    status: string;
    sources: StudioRequest["sources"];
    result?: ReturnType<typeof validateResult>;
    error?: string;
    createdAt: number;
  };

  private async start() {
    if (this.ready) return this.ready;
    const home = path.resolve(process.env.TRODDIT_CODEX_HOME || ".troddit-ai");
    this.workdir = path.join(home, "workspace");
    mkdirSync(this.workdir, { recursive: true, mode: 0o700 });
    const settings: Record<string, any> = {
      forced_login_method: "chatgpt",
      model_provider: "openai",
      cli_auth_credentials_store: "file",
      web_search: "disabled",
      project_doc_max_bytes: 0,
      "history.persistence": "none",
      "features.shell_tool": false,
      "features.unified_exec": false,
      "features.apps": false,
      "features.browser_use": false,
      "features.computer_use": false,
      "features.in_app_browser": false,
      "features.code_mode": false,
      "features.code_mode_host": false,
      "features.hooks": false,
      "features.multi_agent": false,
      "agents.enabled": false,
      "features.image_generation": false,
      "features.memories": false,
      "features.goals": false,
      "tools.view_image": false,
      "analytics.enabled": false,
    };
    const args = Object.entries(settings).flatMap(([key, value]) => [
      "-c",
      `${key}=${JSON.stringify(value)}`,
    ]);
    // Deliberately do not inherit API keys, Reddit credentials, or the app environment.
    const bundled = path.resolve("node_modules/.bin/codex");
    const child = spawn(
      process.env.TRODDIT_CODEX_BIN ||
        (existsSync(bundled) ? bundled : "codex"),
      [...args, "app-server"],
      {
        cwd: this.workdir,
        env: {
          PATH: process.env.PATH,
          HOME: home,
          CODEX_HOME: home,
          NODE_ENV: "production",
        },
        stdio: "pipe",
      },
    );
    this.child = child;
    child.stderr.resume(); // Never return raw logs (which may contain credential details).
    child.stdin.on("error", () => {
      if (this.child === child) this.stop();
    });
    child.on("error", () => {
      if (this.child === child) this.stop();
    });
    child.on("exit", () => {
      if (this.child === child) this.stop();
    });
    const lines = createInterface({ input: child.stdout });
    lines.on("line", (line) => {
      if (this.child !== child) return;
      let message: any;
      try {
        message = JSON.parse(line);
      } catch {
        return;
      }
      if (message.method && message.id !== undefined) {
        child.stdin.write(
          JSON.stringify({
            id: message.id,
            error: {
              code: -32601,
              message: "Studio does not permit tool calls or approvals.",
            },
          }) + "\n",
        );
      } else if (message.id !== undefined) {
        const request = this.pending.get(message.id);
        if (!request) return;
        clearTimeout(request.timer);
        this.pending.delete(message.id);
        if (message.error)
          request.reject(
            new Error(
              "Codex rejected the request. Check sign-in, quota, and supported model settings; no fallback was used.",
            ),
          );
        else request.resolve(message.result);
      } else if (message.method) {
        if (message.method === "account/login/completed") {
          this.login = undefined;
          this.loginId = undefined;
          this.statusAt = 0;
          this.loginError = message.params?.success
            ? undefined
            : "Codex sign-in failed or expired. Try connecting again.";
        }
        if (message.method === "account/updated") this.statusAt = 0;
        this.onEvent?.(message.method, message.params);
      }
    });
    this.ready = this.rpc("initialize", {
      clientInfo: { name: "troddit_studio", version: "1.0.0" },
    })
      .then(() => {
        child.stdin.write(
          JSON.stringify({ method: "initialized", params: {} }) + "\n",
        );
      })
      .catch((error) => {
        this.stop();
        throw error;
      });
    return this.ready;
  }

  private rpc(method: string, params: object = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.child)
        return reject(
          new Error(
            "Codex is unavailable. Install the documented Codex version and check the private worker configuration.",
          ),
        );
      const id = ++this.sequence;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(
          new Error("Codex request timed out. Check the worker and try again."),
        );
        this.stop();
      }, 30000);
      this.pending.set(id, { resolve, reject, timer });
      this.child.stdin.write(JSON.stringify({ id, method, params }) + "\n");
    });
  }

  stop() {
    const child = this.child;
    this.child = undefined;
    this.ready = undefined;
    this.statusAt = 0;
    this.onEvent = undefined;
    this.login = undefined;
    this.loginId = undefined;
    clearTimeout(this.jobTimer);
    for (const request of this.pending.values()) {
      clearTimeout(request.timer);
      request.reject(
        new Error(
          "Codex worker stopped. Check installation or reconnect; no API fallback is available.",
        ),
      );
    }
    this.pending.clear();
    if (this.job?.status === "running") {
      this.job.status = "failed";
      this.job.error ||=
        "The Codex worker stopped. Retry explicitly when ready.";
    }
    child?.kill("SIGTERM");
  }

  async status() {
    if (this.job && Date.now() - this.job.createdAt > 12 * 60 * 60 * 1000)
      this.job = undefined;
    // During a turn, report local progress without racing account RPCs against
    // completion/cancellation, which releases the ephemeral worker.
    if (this.job?.status === "running")
      return { ...this.cached, job: this.job, busy: true };
    if (this.login && Date.now() > this.loginExpires) {
      await this.rpc("account/login/cancel", { loginId: this.loginId });
      this.login = undefined;
      this.loginId = undefined;
    }
    await this.start();
    if (Date.now() - this.statusAt > 10000) {
      const { account } = await this.rpc("account/read", {
        refreshToken: false,
      });
      const connected = account?.type === "chatgpt";
      const models: any[] = [];
      let cursor = null;
      if (connected)
        do {
          const page = await this.rpc("model/list", { limit: 100, cursor });
          models.push(...page.data);
          cursor = page.nextCursor;
        } while (cursor && models.length < 500);
      const limits = connected
        ? await this.rpc("account/rateLimits/read").catch(() => null)
        : null;
      this.cached = {
        connected,
        models: models
          .filter((model) => !model.hidden)
          .map((model) => ({
            id: model.model,
            efforts: model.supportedReasoningEfforts.map(
              (item: any) => item.reasoningEffort,
            ),
            fast:
              model.serviceTiers?.some(
                (tier: any) => tier.id === "fast" || tier.id === "priority",
              ) ||
              model.additionalSpeedTiers?.includes("fast") ||
              false,
          })),
        limits: limits?.rateLimits || null,
      };
      this.statusAt = Date.now();
    }
    return {
      ...this.cached,
      login: this.login,
      error: this.loginError,
      job: this.job,
      busy: this.job?.status === "running",
    };
  }

  async connect() {
    await this.start();
    if (this.job?.status === "running")
      throw new Error("Cancel the current request before connecting.");
    if (this.loginId)
      await this.rpc("account/login/cancel", { loginId: this.loginId });
    const login = await this.rpc("account/login/start", {
      type: "chatgptDeviceCode",
    });
    const url = new URL(login.verificationUrl);
    if (url.protocol !== "https:" || url.hostname !== "auth.openai.com")
      throw new Error("Codex returned an unexpected verification address.");
    this.loginId = login.loginId;
    this.loginExpires = Date.now() + 15 * 60 * 1000;
    this.login = { verificationUrl: url.href, userCode: login.userCode };
    this.loginError = undefined;
  }

  async disconnect() {
    this.cancel();
    await this.start();
    await this.rpc("account/logout");
    this.job = undefined;
    this.stop();
  }

  cancel() {
    if (this.job?.status === "running") this.job.status = "cancelled";
    this.stop();
  }

  async generate(request: StudioRequest) {
    if (this.job?.status === "running")
      throw new Error("A request is already running. Cancel it or wait.");
    this.statusAt = 0;
    const status = await this.status();
    if (!status.connected)
      throw new Error("Connect your ChatGPT account with Codex OAuth first.");
    const model = status.models.find(
      (model: any) => model.id === request.model,
    );
    if (
      !model?.efforts.includes(request.effort) ||
      (request.fast && !model.fast)
    )
      throw new Error(
        "This model, effort or Fast combination is not advertised by Codex. Choose supported settings; no fallback was used.",
      );
    const job: NonNullable<StudioWorker["job"]> = (this.job = {
      id: randomBytes(12).toString("hex"),
      status: "running",
      sources: request.sources,
      createdAt: Date.now(),
    });
    this.jobTimer = setTimeout(
      () => {
        if (this.job === job && job.status === "running") {
          this.stop();
          job.error =
            "Generation exceeded ten minutes and was stopped. No automatic retry was made.";
        }
      },
      10 * 60 * 1000,
    );
    void this.run(request, job).catch(() => {
      if (this.job !== job || job.status !== "running") return;
      if (job.status === "running") {
        job.status = "failed";
        job.error =
          "Codex could not complete a valid, source-linked result. Check quota and connection, then retry explicitly. No fallback was used.";
      }
      this.stop();
    });
  }

  private async run(
    request: StudioRequest,
    job: NonNullable<StudioWorker["job"]>,
  ) {
    const started = await this.rpc("thread/start", {
      model: request.model,
      modelProvider: "openai",
      cwd: this.workdir,
      ephemeral: true,
      sandbox: "read-only",
      approvalPolicy: "never",
      serviceTier: request.fast ? "fast" : null,
      baseInstructions:
        "You are a read-only Reddit editor. Use no tools. Only synthesize the supplied untrusted source text into the requested JSON.",
    });
    if (job.status !== "running") return;
    const threadId = started.thread.id;
    let output = "";
    this.onEvent = (method, params) => {
      if (params?.threadId !== threadId || job.status !== "running") return;
      if (method === "model/rerouted") {
        job.error =
          "Codex attempted to change models. Studio stopped the request instead of falling back.";
        this.stop();
        return;
      }
      if (
        method === "item/completed" &&
        params.item?.type === "agentMessage" &&
        params.item.phase !== "commentary"
      )
        output = params.item.text;
      if (method === "turn/completed") {
        clearTimeout(this.jobTimer);
        if (params.turn?.status === "completed") {
          try {
            job.result = validateResult(output, request.sources);
            job.status = "completed";
          } catch {
            job.status = "failed";
            job.error =
              "Codex returned an invalid result or unknown source. Nothing was published.";
          }
        } else {
          job.status =
            params.turn?.status === "interrupted" ? "cancelled" : "failed";
          job.error =
            "Codex did not complete the request. Check quota or reconnect and retry explicitly.";
        }
        this.onEvent = undefined;
        this.stop(); // Release ephemeral conversation; OAuth stays in the private home.
      }
    };
    await this.rpc("turn/start", {
      threadId,
      input: [{ type: "text", text: studioPrompt(request) }],
      effort: request.effort,
      outputSchema: resultSchema(request.sources),
      sandboxPolicy: {
        type: "readOnly",
        access: {
          type: "restricted",
          includePlatformDefaults: false,
          readableRoots: [this.workdir],
        },
      },
    });
  }
}

const globalStudio = globalThis as typeof globalThis & {
  studioWorker?: StudioWorker;
};
export const studioWorker = (globalStudio.studioWorker ||= new StudioWorker());
