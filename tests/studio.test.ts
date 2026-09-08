import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { validateRequest, validateResult, studioPrompt } from "../lib/studio";
import { StudioWorker } from "../lib/studio-server";
import handler from "../src/pages/api/studio";
import {
  readStudioConfig,
  checkStudioPassword,
  passwordConfig,
  saveStudioConfig,
} from "../lib/studio-config";

const source = {
  id: "t3_abc",
  title: "A story",
  text: "A useful excerpt",
  url: "/r/Design/comments/abc/a_story/",
  subreddit: "Design",
};
const input = {
  kind: "digest",
  interests: "design",
  model: "gpt-5.6-luna",
  effort: "max",
  fast: false,
  sources: [source],
};

test("Owner settings are private, exclusive and fail closed when corrupt", () => {
  const home = mkdtempSync(path.join(tmpdir(), "studio-owner-"));
  process.env.TRODDIT_CODEX_HOME = home;
  try {
    const owner = passwordConfig("fixture-owner-password");
    saveStudioConfig(owner, true);
    assert.equal(
      statSync(path.join(home, "studio-owner.json")).mode & 0o777,
      0o600,
    );
    assert.throws(
      () => saveStudioConfig(passwordConfig("other-owner-password"), true),
      /already/,
    );
    assert.deepEqual(readStudioConfig(), owner);
    writeFileSync(path.join(home, "studio-owner.json"), "corrupt");
    assert.throws(() => readStudioConfig(), /remains locked/);
  } finally {
    rmSync(home, { recursive: true, force: true });
    delete process.env.TRODDIT_CODEX_HOME;
  }
});

test("Studio accepts exactly three bounded workflows and local sources", () => {
  assert.equal(validateRequest(input).sources.length, 1);
  assert.equal(
    validateRequest({
      ...input,
      kind: "communities",
      sources: [{ ...source, url: "/r/Design" }],
    }).kind,
    "communities",
  );
  for (const value of [
    { ...input, kind: "answers" },
    { ...input, sources: [] },
    { ...input, sources: [source, source] },
    { ...input, interests: "x".repeat(501) },
    { ...input, sources: [{ ...source, text: "x".repeat(2001) }] },
    ...[
      "https://evil.example",
      "//evil.example",
      "/r/Design/../../api/studio",
      "/r/Other/comments/abc/story/",
      "/r/Design/comments/abc/story/?evil=1",
    ].map((url) => ({ ...input, sources: [{ ...source, url }] })),
  ])
    assert.throws(() => validateRequest(value));
});

test("Studio output citations are allow-listed and deduplicated", () => {
  const item = {
    sourceId: source.id,
    headline: "Hello",
    summary: "Summary",
    reason: "Relevant",
  };
  assert.equal(
    validateResult(JSON.stringify({ intro: "Digest", items: [item] }), [source])
      .items.length,
    1,
  );
  assert.throws(() =>
    validateResult(
      JSON.stringify({
        intro: "Digest",
        items: [{ ...item, sourceId: "fake" }],
      }),
      [source],
    ),
  );
  assert.throws(() =>
    validateResult(JSON.stringify({ intro: "Digest", items: [item, item] }), [
      source,
    ]),
  );
  assert.match(studioPrompt(validateRequest(input)), /untrusted data/);
  assert.match(studioPrompt(validateRequest(input)), /title-only/);
});

test("OAuth protocol worker: discovery, all modes, cancellation and no fallback", async () => {
  const home = mkdtempSync(path.join(tmpdir(), "studio-worker-"));
  process.env.TRODDIT_CODEX_BIN = path.resolve(
    "tests/fixtures/codex-studio.cjs",
  );
  process.env.TRODDIT_CODEX_HOME = home;
  process.env.OPENAI_API_KEY = "must-not-reach-child";
  process.env.TRODDIT_AI_PASSWORD = "must-not-reach-child";
  const worker = new StudioWorker();
  const settle = async () => {
    for (
      let attempt = 0;
      attempt < 100 && worker.job?.status === "running";
      attempt++
    )
      await new Promise((resolve) => setTimeout(resolve, 20));
    assert.notEqual(worker.job?.status, "running");
  };
  try {
    assert.equal((await worker.status()).connected, false);
    await assert.rejects(worker.generate(validateRequest(input)), /OAuth/);
    await worker.connect();
    assert.equal(worker.login?.userCode, "TEST-CODE");
    await new Promise((resolve) => setTimeout(resolve, 100));
    const status = await worker.status();
    assert.equal(status.connected, true);
    assert.equal(status.models[0].fast, true);
    await assert.rejects(
      worker.generate(validateRequest({ ...input, model: "not-available" })),
      /not advertised/,
    );
    await assert.rejects(
      worker.generate(validateRequest({ ...input, effort: "unsupported" })),
      /not advertised/,
    );
    for (const kind of ["digest", "stories", "communities"]) {
      await worker.generate(
        validateRequest({
          ...input,
          kind,
          fast: true,
          sources: [
            {
              ...source,
              url: kind === "communities" ? "/r/Design" : source.url,
            },
          ],
        }),
      );
      await settle();
      assert.equal(worker.job?.status, "completed");
      assert.equal(worker.job?.result?.items[0].sourceId, source.id);
    }
    await worker.generate(
      validateRequest({ ...input, interests: "WAIT_FOR_CANCEL" }),
    );
    await assert.rejects(
      worker.generate(validateRequest(input)),
      /already running/,
    );
    worker.cancel();
    assert.equal(worker.job?.status, "cancelled");
    for (const interests of ["BAD_CITATION", "MODEL_REROUTE"]) {
      await worker.generate(validateRequest({ ...input, interests }));
      await settle();
      assert.equal(worker.job?.status, "failed");
      assert.equal(worker.job?.result, undefined);
    }
    await worker.disconnect();
    assert.equal((await worker.status()).connected, false);
    assert.equal(worker.job, undefined);
  } finally {
    worker.stop();
    // Let the executable exit before removing its private fixture directory.
    await new Promise((resolve) => setTimeout(resolve, 100));
    rmSync(home, { recursive: true, force: true });
    delete process.env.OPENAI_API_KEY;
    delete process.env.TRODDIT_AI_PASSWORD;
  }
});

test("UI setup persists owner settings and enforces CSRF, password changes and sessions", async () => {
  const home = mkdtempSync(path.join(tmpdir(), "studio-config-"));
  process.env.TRODDIT_CODEX_HOME = home;
  const password = "test-only-owner-passphrase";
  let csrf = "";
  const call = async (
    method: string,
    body = {},
    token = "",
    origin = "https://reader.example",
  ) => {
    const response: any = {
      code: 200,
      headers: {},
      data: null,
      setHeader(key, value) {
        this.headers[key] = value;
      },
      status(code) {
        this.code = code;
        return this;
      },
      json(data) {
        this.data = data;
        return this;
      },
    };
    await handler(
      {
        method,
        body,
        cookies: { troddit_studio: token, troddit_studio_csrf: csrf },
        headers: {
          origin,
          "content-type": "application/json",
          "x-studio-csrf": csrf,
          "sec-fetch-site":
            origin === "https://evil.example" ? "cross-site" : "same-origin",
        },
      } as any,
      response,
    );
    if (response.data?.csrfToken) csrf = response.data.csrfToken;
    return response;
  };
  try {
    assert.equal((await call("POST", { action: "setup", password })).code, 403);
    assert.equal((await call("GET")).data.configured, false);
    assert.equal(
      (
        await call(
          "POST",
          { action: "setup", password },
          "",
          "http://reader.example",
        )
      ).code,
      403,
    );
    assert.equal((await call("POST", { action: "setup", password })).code, 200);
    assert.equal(
      (await call("POST", { action: "setup", password: "another-password" }))
        .code,
      409,
    );
    assert.equal(checkStudioPassword(readStudioConfig(), password), true);
    assert.notEqual(readStudioConfig().hash, password);
    assert.equal(
      (await call("POST", { action: "generate", ...input })).code,
      401,
    );
    assert.equal(
      (
        await call(
          "POST",
          { action: "unlock", password },
          "",
          "https://evil.example",
        )
      ).code,
      403,
    );
    assert.equal(
      (await call("POST", { action: "unlock", password: "wrong" })).code,
      401,
    );
    const unlocked = await call("POST", {
      action: "unlock",
      password,
    });
    assert.equal(unlocked.code, 200);
    assert.match(
      unlocked.headers["Set-Cookie"],
      /HttpOnly; SameSite=Strict;.*Secure/,
    );
    assert.equal(unlocked.headers["Cache-Control"], "private, no-store");
    const token = unlocked.headers["Set-Cookie"].split(";")[0].split("=")[1];
    assert.equal((await call("POST", { action: "clear" }, token)).code, 200);
    const preferences = { model: "gpt-5.6-luna", effort: "max", fast: true };
    assert.equal(
      (await call("POST", { action: "preferences", ...preferences }, token))
        .code,
      200,
    );
    assert.deepEqual(readStudioConfig().preferences, preferences);
    assert.equal(
      (
        await call(
          "POST",
          { action: "generate", ...input, kind: "answers" },
          token,
        )
      ).code,
      400,
    );
    const changed = await call(
      "POST",
      {
        action: "password",
        currentPassword: password,
        password: "new-owner-passphrase",
      },
      token,
    );
    assert.equal(changed.code, 200);
    assert.equal(checkStudioPassword(readStudioConfig(), password), false);
    assert.equal(
      checkStudioPassword(readStudioConfig(), "new-owner-passphrase"),
      true,
    );
    assert.deepEqual(readStudioConfig().preferences, preferences);
    assert.equal((await call("POST", { action: "clear" }, token)).code, 401);
    for (let i = 0; i < 4; i++)
      await call("POST", { action: "unlock", password: "wrong" });
    assert.equal(
      (await call("POST", { action: "unlock", password: "wrong" })).code,
      429,
    );
  } finally {
    rmSync(home, { recursive: true, force: true });
    delete process.env.TRODDIT_CODEX_HOME;
  }
});
