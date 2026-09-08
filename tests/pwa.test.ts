import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";

const source = readFileSync("lib/register-service-worker.js", "utf8");

test("PWA registration removes only legacy response caches and never fetches private data", async () => {
  const registrations: string[] = [];
  const removed: string[] = [];
  runInNewContext(source, {
    window: { caches: {} },
    document: { readyState: "complete" },
    navigator: { serviceWorker: { register: async (url: string) => registrations.push(url) } },
    caches: { delete: async (name: string) => removed.push(name) },
    fetch: () => { throw new Error("Registration must not fetch page data"); },
  });
  await new Promise(setImmediate);
  assert.deepEqual(registrations, ["/sw.js"]);
  assert.deepEqual(removed, ["next-data", "start-url", "apis", "others"]);
});

test("PWA registration is safe during server rendering", () => {
  assert.doesNotThrow(() => runInNewContext(source, {}));
});
