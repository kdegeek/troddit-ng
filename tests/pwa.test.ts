import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import { sharePost } from "../lib/share";

const source = readFileSync("lib/register-service-worker.js", "utf8");

test("PWA registration removes only legacy response caches and never fetches private data", async () => {
  const registrations: string[] = [];
  const removed: string[] = [];
  runInNewContext(source, {
    window: { caches: {} },
    document: { readyState: "complete" },
    navigator: {
      serviceWorker: {
        register: async (url: string, options) => {
          assert.equal(options.updateViaCache, "none");
          registrations.push(url);
        },
      },
    },
    caches: { delete: async (name: string) => removed.push(name) },
    fetch: () => {
      throw new Error("Registration must not fetch page data");
    },
  });
  await new Promise(setImmediate);
  assert.deepEqual(registrations, ["/sw.js"]);
  assert.deepEqual(removed, ["next-data", "start-url", "apis", "others"]);
});

test("PWA registration is safe during server rendering", () => {
  assert.doesNotThrow(() => runInNewContext(source, {}));
});

test("native share uses self-hosted origin and cancellation does not copy", async () => {
  let shared: ShareData;
  const platform = {
    share: async (data) => {
      shared = data;
    },
    clipboard: {
      writeText: async () => {
        throw new Error("should not copy");
      },
    },
  } as any;
  assert.equal(
    await sharePost(
      "Hello",
      "/r/test/comments/abc/hello/",
      "https://reddit.example",
      platform,
    ),
    "shared",
  );
  assert.equal(shared.url, "https://reddit.example/r/test/comments/abc/hello/");
  platform.share = async () => {
    throw { name: "AbortError" };
  };
  assert.equal(
    await sharePost("Hello", "/abc", "https://reddit.example", platform),
    "cancelled",
  );
});

test("share fallback waits for clipboard and propagates failure", async () => {
  let copied = "";
  const platform = {
    clipboard: {
      writeText: async (url) => {
        copied = url;
      },
    },
  } as any;
  assert.equal(
    await sharePost("Hello", "/abc", "https://reddit.example", platform),
    "copied",
  );
  assert.equal(copied, "https://reddit.example/abc");
  platform.clipboard.writeText = async () => {
    throw new Error("denied");
  };
  await assert.rejects(
    sharePost("Hello", "/abc", "https://reddit.example", platform),
    /denied/,
  );
});
