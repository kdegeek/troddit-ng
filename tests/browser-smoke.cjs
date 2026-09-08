// Run against a running app: node tests/browser-smoke.cjs http://localhost:3000
// Uses an isolated agent-browser session and synthetic responses, not live Reddit.
const { execFileSync } = require("node:child_process");
const assert = require("node:assert/strict");
const { listing, thread } = require("./browser-fixtures.cjs");
const origin = process.argv[2] ?? "http://localhost:3000";
const env = { ...process.env, AGENT_BROWSER_ARGS: "--disable-web-security" };
// The CLI's mocked cross-origin responses have no CORS headers. This flag is
// confined to this disposable test session; these are UI, not transport tests.
const run = (...args) =>
  execFileSync("agent-browser", ["--session", "troddit-smoke", ...args], {
    env,
    encoding: "utf8",
    timeout: 60000,
  });
const evaluate = (code) => JSON.parse(run("eval", code));
const wait = (code) => run("wait", "--fn", `Boolean(${code})`);
const click = (name) =>
  run("find", "role", "button", "click", "--name", name, "--exact");
let checks = 0;
const check = (value, message) => {
  assert.ok(value, message);
  checks++;
  console.log(`PASS ${message}`);
};
try {
  run("open", `${origin}/settings`);
  run("network", "route", "*/api/auth/session", "--body", "{}");
  run(
    "network",
    "route",
    "*reddit.com*/comments/*",
    "--body",
    JSON.stringify(thread),
  );
  run("network", "route", "*reddit.com*", "--body", JSON.stringify(listing));
  run("set", "viewport", "1440", "1050");
  run("open", origin);
  wait("document.querySelector('.post-card')");
  click("Compact");
  wait("document.querySelectorAll('.post-card-compact').length === 5");
  check(
    evaluate(
      "document.querySelector('.view-switcher button[aria-pressed=true]').textContent === 'Compact'",
    ),
    "Compact preset renders five rows",
  );
  run("reload");
  wait("document.querySelector('.post-card-compact')");
  check(
    evaluate(
      "document.querySelector('.view-switcher button[aria-pressed=true]').textContent === 'Compact'",
    ),
    "Display preference survives reload",
  );
  click("Gallery");
  wait("document.querySelector('.view-gallery img')");
  check(
    evaluate("!document.querySelector('.post-card')"),
    "Gallery uses the media renderer",
  );
  click("Reader");
  wait("document.querySelectorAll('.post-card').length === 5");
  // Image decoding and masonry measurements must settle before coordinate clicks.
  wait("Array.from(document.images).every(image => image.complete)");
  run("wait", "500");
  evaluate(
    "document.querySelector('button.settings-action').scrollIntoView({block:'center'}); true",
  );
  run("wait", "300");
  click("Reveal hidden post content");
  wait("document.body.textContent.includes('This text should stay hidden')");
  check(
    evaluate(
      "document.body.textContent.includes('This text should stay hidden')",
    ),
    "Spoiler content requires explicit reveal",
  );
  evaluate(
    "document.querySelector('a[href*=demo1]').scrollIntoView({block:'center'}); true",
  );
  run("wait", "300");
  run("focus", ".post-card-title a[href*=demo1]");
  run("press", "Enter");
  wait("document.querySelector('[role=dialog]')");
  check(
    evaluate(
      "document.querySelector('[role=dialog]').contains(document.activeElement)",
    ),
    "Post opens with keyboard focus inside",
  );
  run("press", "Escape");
  wait("!document.querySelector('[role=dialog]')");
  check(
    evaluate(
      "location.pathname === '/' && document.activeElement.textContent.includes('What small change')",
    ),
    "Escape returns to feed and restores focus",
  );
  run("set", "viewport", "390", "844");
  evaluate("document.documentElement.style.setProperty('--safe-top','59px'); document.querySelector('.post-comments[href*=demo1]').scrollIntoView({block:'center'}); true");
  // Masonic disables pointer events while scrolling/repositioning after resize.
  // Wait for hit testing, not a fixed delay that can click through the card.
  wait("(() => { const link = document.querySelector('.post-comments[href*=demo1]'); const rect = link.getBoundingClientRect(); return link.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)); })()");
  run("find", "role", "link", "click", "--name", "43 comments", "--exact");
  wait("document.querySelector('.post-detail')");
  check(evaluate("document.querySelector('.post-detail').getBoundingClientRect().height === 844 && document.querySelector('.detail-back').getBoundingClientRect().top >= 59"), "Mobile thread fills the viewport and respects the notch");
  run("press", "Escape");
  wait("!document.querySelector('.post-detail')");
  evaluate("document.documentElement.style.removeProperty('--safe-top'); true");
  evaluate("scrollTo(0,0); true");
  click("Search");
  wait("document.querySelector('[role=dialog] input')");
  check(
    evaluate(
      "document.querySelector('[role=dialog]').contains(document.activeElement)",
    ),
    "Mobile search traps focus",
  );
  run("press", "Escape");
  click("Toggle light and dark theme");
  check(
    evaluate("document.documentElement.dataset.theme === 'dark'"),
    "Dark theme can be selected",
  );
  check(
    evaluate("document.documentElement.scrollWidth <= innerWidth"),
    "Mobile feed has no horizontal overflow",
  );
  run("open", `${origin}/settings`);
  wait("document.querySelector('[role=tab]')");
  run("find", "role", "tab", "click", "--name", "Data", "--exact");
  check(
    evaluate(
      "document.querySelector('[role=tab][aria-selected=true]').textContent === 'Data'",
    ),
    "Settings tabs switch panels",
  );
  check(
    evaluate("document.documentElement.scrollWidth <= innerWidth"),
    "Mobile settings has no horizontal overflow",
  );
  console.log(`${checks} browser checks passed`);
} finally {
  run("close");
}
