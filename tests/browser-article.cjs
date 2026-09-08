// Article stress fixture: content goes through the real thread/HTML renderers.
const { execFileSync } = require("node:child_process");
const assert = require("node:assert/strict");
const { listing, thread } = structuredClone(require("./browser-fixtures.cjs"));
const origin = process.argv[2] ?? "http://localhost:30710";
const html = `<div class="md"><h2>A more comfortable place to read</h2><p>Long articles should feel at home on a small screen, with room to breathe and no lost edges.</p><p>${"unbroken-text-".repeat(35)}</p><pre><code>${"wide code column ".repeat(30)}</code></pre><table><thead><tr>${"<th>Comparison column</th>".repeat(8)}</tr></thead><tbody><tr>${"<td>Detailed information</td>".repeat(8)}</tr></tbody></table><p>Keep reading without sideways page scrolling.</p></div>`;
listing.data.children[1].data.selftext_html = html;
thread[0].data.children[0].data.selftext_html = html;
thread[0].data.children[0].data.upvote_ratio = 0.98;
const comment = (id, replies = "") => ({
  kind: "t1",
  data: {
    id,
    name: `t1_${id}`,
    author: "reader",
    body: "Article discussion",
    body_html: html,
    score: 12,
    created_utc: 1788790000,
    replies,
    depth: 0,
    parent_id: "t3_demo1",
    link_id: "t3_demo1",
    all_awardings: [],
  },
});
thread[1].data.children = [
  comment("comment1", {
    kind: "Listing",
    data: { children: [comment("comment2")] },
  }),
];
const run = (...args) =>
  execFileSync("agent-browser", ["--session", "article", ...args], {
    encoding: "utf8",
    env: { ...process.env, AGENT_BROWSER_ARGS: "--disable-web-security" },
    timeout: 60000,
  });
const evaluate = (code) => JSON.parse(run("eval", code));
const wait = (code) => run("wait", "--fn", `Boolean(${code})`);
const swipe = (x, y, dx, dy, cancel = false) =>
  evaluate(`(() => {
  const target = document.querySelector('.post-detail');
  const send = (type,x,y) => { const touch = new Touch({identifier:1,target,clientX:x,clientY:y}); target.dispatchEvent(new TouchEvent(type,{bubbles:true,cancelable:true,touches:type==='touchend'||type==='touchcancel'?[]:[touch],changedTouches:[touch]})); };
  send('touchstart',${x},${y}); send('touchmove',${x + dx},${y + dy}); send('${cancel ? "touchcancel" : "touchend"}',${x + dx},${y + dy}); return true;
})()`);
try {
  run("set", "viewport", "390", "844");
  run("open", `${origin}/settings`);
  wait("document.querySelector('[role=tab]')");
  run("network", "route", "*/api/auth/session", "--body", "{}");
  run(
    "network",
    "route",
    "*reddit.com*/comments/*",
    "--body",
    JSON.stringify(thread),
  );
  run("network", "route", "*reddit.com*", "--body", JSON.stringify(listing));
  run("open", origin);
  wait("document.querySelector('.post-card-title a[href*=demo1]')");
  run("focus", ".post-card-title a[href*=demo1]");
  run("press", "Enter");
  wait("document.querySelector('.post-detail .reading-body table')");
  run("wait", "700");
  const widths = evaluate(
    `Array.from(document.querySelectorAll('.post-detail, .post-detail .reading-body')).map(e=>({width:e.clientWidth,scroll:e.scrollWidth}))`,
  );
  console.log("Article widths", widths);
  assert.ok(
    widths.every((e) => e.scroll <= e.width + 1),
    "Article and comment bodies must not overflow horizontally",
  );
  assert.ok(
    evaluate(
      "Array.from(document.querySelectorAll('.post-detail pre, .post-detail table')).every(e=>e.scrollWidth>e.clientWidth && getComputedStyle(e).overflowX==='auto')",
    ),
    "Wide blocks scroll locally",
  );
  for (const width of [320, 390, 740, 1280]) {
    run("set", "viewport", String(width), "844");
    evaluate(
      "document.documentElement.style.setProperty('--safe-left','12px'); document.documentElement.style.setProperty('--safe-right','12px'); true",
    );
    run("wait", "300");
    assert.ok(
      evaluate(
        "document.querySelector('.post-detail').scrollWidth<=document.querySelector('.post-detail').clientWidth+1",
      ),
      `No article overflow at ${width}px`,
    );
  }
  run("set", "viewport", "390", "844");
  evaluate(
    "document.documentElement.style.setProperty('--safe-top','59px'); true",
  );
  console.log(
    run(
      "screenshot",
      require("node:path").resolve(".amp/in/artifacts/article-mobile.png"),
    ),
  );
  run("find", "role", "button", "click", "--name", "expand text", "--exact");
  assert.ok(
    evaluate(
      "(() => { const table = document.querySelector('.post-detail table'); table.scrollIntoView({block:'center'}); table.scrollLeft = 90; return table.scrollLeft > 0; })()",
    ),
    "Wide table content remains reachable",
  );
  run("wait", "400");
  console.log(
    run(
      "screenshot",
      require("node:path").resolve(
        ".amp/in/artifacts/article-table-mobile.png",
      ),
    ),
  );
  swipe(10, 300, 12, 150);
  assert.ok(
    evaluate("!!document.querySelector('.post-detail')"),
    "Vertical swipe keeps article open",
  );
  swipe(150, 300, 160, 2);
  assert.ok(
    evaluate("!!document.querySelector('.post-detail')"),
    "Content swipe keeps article open",
  );
  swipe(10, 300, 35, 2);
  assert.ok(
    evaluate("!!document.querySelector('.post-detail')"),
    "Short edge swipe cancels",
  );
  swipe(10, 300, 180, 2, true);
  assert.ok(
    evaluate("!!document.querySelector('.post-detail')"),
    "Interrupted swipe cancels",
  );
  swipe(10, 300, 180, 24);
  wait("!document.querySelector('.post-detail')");
  assert.equal(evaluate("location.pathname"), "/");
  console.log(
    "PASS article widths, local overflow, responsive safe areas, swipe exclusions/cancellation and edge-swipe return to feed",
  );
} catch (error) {
  console.log(
    evaluate(
      "Array.from(document.querySelectorAll('.post-detail pre, .post-detail table')).map(e=>({tag:e.tagName,width:e.clientWidth,scroll:e.scrollWidth,overflow:getComputedStyle(e).overflowX}))",
    ),
  );
  throw error;
} finally {
  run("close");
}
