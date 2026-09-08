#!/usr/bin/env node
// Protocol fixture only. Never used by production configuration.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");
const auth = path.join(process.env.CODEX_HOME, "fixture-auth");
const send = (value) => process.stdout.write(JSON.stringify(value) + "\n");
const event = (method, params) => send({ method, params });
assert.equal(process.env.OPENAI_API_KEY, undefined);
assert.equal(process.env.TRODDIT_AI_PASSWORD, undefined);
assert.ok(process.argv.includes('forced_login_method="chatgpt"'));
assert.ok(process.argv.includes("features.shell_tool=false"));
let request;
readline.createInterface({ input: process.stdin }).on("line", (line) => {
  const { id, method, params } = JSON.parse(line);
  if (!method) return;
  let result = {};
  switch (method) {
    case "initialize":
      break;
    case "initialized":
      return;
    case "account/read":
      result = { account: fs.existsSync(auth) ? { type: "chatgpt" } : null };
      break;
    case "account/login/start":
      assert.equal(params.type, "chatgptDeviceCode");
      result = {
        loginId: "fixture-login",
        verificationUrl: "https://auth.openai.com/codex/device",
        userCode: "TEST-CODE",
      };
      setTimeout(() => {
        fs.writeFileSync(auth, "fixture");
        event("account/login/completed", { success: true });
      }, 50);
      break;
    case "account/login/cancel":
      break;
    case "account/logout":
      fs.rmSync(auth, { force: true });
      break;
    case "account/rateLimits/read":
      result = { rateLimits: { primary: { usedPercent: 12 } } };
      break;
    case "model/list":
      result = {
        data: [
          {
            model: "gpt-5.6-luna",
            hidden: false,
            supportedReasoningEfforts: [{ reasoningEffort: "max" }],
            serviceTiers: [{ id: "fast" }],
          },
        ],
        nextCursor: null,
      };
      break;
    case "thread/start":
      assert.equal(params.ephemeral, true);
      assert.equal(params.sandbox, "read-only");
      assert.equal(params.approvalPolicy, "never");
      request = params;
      result = { thread: { id: "fixture-thread" } };
      break;
    case "turn/start": {
      assert.equal(params.sandboxPolicy.access.type, "restricted");
      assert.deepEqual(params.sandboxPolicy.access.readableRoots, [
        process.cwd(),
      ]);
      assert.equal(request.model, "gpt-5.6-luna");
      assert.equal(params.effort, "max");
      const text = params.input[0].text;
      const sourceId =
        params.outputSchema.properties.items.items.properties.sourceId.enum[0];
      result = { turn: { id: "fixture-turn", status: "inProgress" } };
      if (!text.includes("WAIT_FOR_CANCEL"))
        setTimeout(() => {
          if (text.includes("MODEL_REROUTE"))
            return event("model/rerouted", { threadId: "fixture-thread" });
          const result = {
            intro: "A fixture briefing.",
            items: [
              {
                sourceId: text.includes("BAD_CITATION") ? "unknown" : sourceId,
                headline: "A source-linked selection",
                summary: "Based on the supplied excerpt.",
                reason: "Relevant to your interests.",
              },
            ],
          };
          event("item/completed", {
            threadId: "fixture-thread",
            item: {
              type: "agentMessage",
              phase: "final_answer",
              text: JSON.stringify(result),
            },
          });
          event("turn/completed", {
            threadId: "fixture-thread",
            turn: { id: "fixture-turn", status: "completed" },
          });
        }, 50);
      break;
    }
    default:
      throw new Error(`Unexpected RPC ${method}`);
  }
  send({ id, result });
});
