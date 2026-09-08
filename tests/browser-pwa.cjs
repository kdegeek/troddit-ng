// Chromium regression checks, NOT a replacement for the iOS device matrix in PWA.md.
const { execFileSync } = require("node:child_process");
const assert = require("node:assert/strict");
const origin = process.argv[2] || "http://localhost:30710";
const run = (...args) =>
  execFileSync("agent-browser", ["--session", "troddit-pwa", ...args], {
    encoding: "utf8",
    timeout: 60000,
  });
const evaluate = (code) => JSON.parse(run("eval", code));
const wait = (code) => run("wait", "--fn", `Boolean(${code})`);
const click = (name) =>
  run("find", "role", "button", "click", "--name", name, "--exact");
let checks = 0;
const check = (code, message) => {
  assert.ok(evaluate(code), message);
  console.log(`PASS ${message}`);
  checks++;
};
try {
  run("open", `${origin}/settings`);
  wait("document.querySelector('.pwa-settings')");
  check(
    "document.querySelectorAll('link[rel=apple-touch-icon]').length === 1",
    "One Apple touch icon is declared",
  );
  check(
    "!document.querySelector('meta[name=viewport]').content.includes('maximum-scale')",
    "Pinch zoom remains enabled",
  );
  wait("navigator.serviceWorker.controller || navigator.serviceWorker.ready");
  evaluate("navigator.serviceWorker.ready.then(r => r.scope)");
  check(
    "navigator.serviceWorker.getRegistration().then(r => r.updateViaCache === 'none')",
    "Worker updates bypass HTTP cache",
  );
  check(
    "fetch('/sw.js').then(r => r.headers.get('cache-control').includes('no-store'))",
    "Service worker response is not stored by HTTP caches",
  );
  for (const width of [320, 390, 768]) {
    run("set", "viewport", String(width), "844");
    check(
      "document.documentElement.scrollWidth <= innerWidth && document.querySelector('.header-actions').getBoundingClientRect().right <= innerWidth",
      `${width}px layout keeps header actions inside viewport`,
    );
  }
  run("set", "viewport", "390", "844");
  evaluate(
    "document.documentElement.style.setProperty('--safe-top','59px'); true",
  );
  check(
    "getComputedStyle(document.querySelector('.app-header')).paddingTop === '59px' && document.querySelector('.app-header').getBoundingClientRect().height === 119",
    "Simulated notch inset expands header rather than covering actions",
  );
  click("Search");
  wait("document.querySelector('.search-dialog input')");
  check(
    "getComputedStyle(document.querySelector('.search-dialog input')).fontSize === '16px'",
    "Search avoids small-input focus zoom",
  );
  evaluate(
    "Object.defineProperty(visualViewport, 'height', {configurable:true, get:()=>420}); visualViewport.dispatchEvent(new Event('resize')); true",
  );
  wait("document.documentElement.dataset.keyboard === 'true'");
  check(
    "getComputedStyle(document.querySelector('.mobile-navigation')).display === 'none' && document.querySelector('.shell-dialog').getBoundingClientRect().height === 420",
    "Simulated keyboard shrinks dialog and hides bottom navigation",
  );
  evaluate(
    "Object.defineProperty(visualViewport, 'scale', {configurable:true, get:()=>2}); visualViewport.dispatchEvent(new Event('resize')); true",
  );
  wait("document.documentElement.dataset.keyboard === 'false'");
  check(
    "document.documentElement.dataset.keyboard === 'false'",
    "Pinch zoom is not treated as a keyboard",
  );
  evaluate(
    "delete visualViewport.height; delete visualViewport.scale; visualViewport.dispatchEvent(new Event('resize')); true",
  );
  run("press", "Escape");
  wait("!document.querySelector('.shell-dialog')");
  evaluate(
    "document.querySelector('.pwa-settings').scrollIntoView({block:'center'}); true",
  );
  run("wait", "300");
  click("Check for updates");
  wait(
    "!Array.from(document.querySelectorAll('button')).some(b=>b.textContent.includes('Checking…'))",
  );
  check(
    "document.querySelector('.pwa-settings [role=status]').textContent.includes('Update check complete')",
    "Explicit update check reports its result without reload",
  );
  console.log(`${checks} PWA browser checks passed`);
} finally {
  run("close");
}
