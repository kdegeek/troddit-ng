// Synthetic UI/Reddit/AI fixtures, not a live subscription test.
const { execFileSync } = require("node:child_process");
const assert = require("node:assert/strict");
const path = require("node:path");
const { listing } = require("./browser-fixtures.cjs");
const origin = process.argv[2] || "http://localhost:30710";
const run = (...args) =>
  execFileSync("agent-browser", ["--session", "studio-test", ...args], {
    encoding: "utf8",
    timeout: 60000,
    env: { ...process.env, AGENT_BROWSER_ARGS: "--disable-web-security" },
  });
const evaluate = (code) => JSON.parse(run("eval", code));
const wait = (code) => run("wait", "--fn", `Boolean(${code})`);
const click = (name) =>
  run("find", "role", "button", "click", "--name", name, "--exact");
let checks = 0;
const check = (code, label) => {
  assert.ok(evaluate(code), label);
  checks++;
  console.log(`PASS ${label}`);
};
try {
  run("open", `${origin}/settings`);
  run("network", "route", "*/api/auth/session", "--body", "{}");
  run("network", "route", "*reddit.com*", "--body", JSON.stringify(listing));
  run(
    "network",
    "route",
    "*/api/studio",
    "--body",
    JSON.stringify({
      configured: false,
      unlocked: false,
      csrfToken: "fixture-csrf",
    }),
  );
  run("set", "viewport", "1440", "1050");
  run("open", `${origin}/studio`);
  wait("document.querySelector('.studio-unlock')");
  check(
    "document.querySelector('.rail-link[href=\"/studio\"]').getAttribute('aria-current') === 'page'",
    "Studio has its own active desktop section",
  );
  check(
    "document.querySelector('.studio-onboarding').textContent.includes('No API keys')",
    "First-run setup is entirely in the UI",
  );
  if (process.env.STUDIO_SCREENSHOTS)
    run(
      "screenshot",
      path.resolve(".amp/in/artifacts/studio-setup-desktop.png"),
    );
  run("set", "viewport", "390", "844");
  check(
    "document.documentElement.scrollWidth <= innerWidth",
    "Mobile setup form fits the viewport",
  );
  if (process.env.STUDIO_SCREENSHOTS)
    run(
      "screenshot",
      path.resolve(".amp/in/artifacts/studio-setup-mobile.png"),
    );
  evaluate("scrollTo(0,document.documentElement.scrollHeight); true");
  run("wait", "300");
  check(
    "document.querySelector('.studio-onboarding button').getBoundingClientRect().bottom < document.querySelector('.mobile-navigation').getBoundingClientRect().top",
    "Setup action scrolls clear of the mobile tab bar",
  );
  run("set", "viewport", "1440", "1050");
  evaluate(`(() => {
    const realFetch = window.fetch;
    window.studioFixture = { configured:false, unlocked:false, csrfToken:'fixture-csrf', connected:false, models:[{id:'gpt-5.6-luna',efforts:['max'],fast:true}], limits:{primary:{usedPercent:12}} };
    window.studioRequests = [];
    window.fetch = async (url, options) => {
      if (url !== '/api/studio') return realFetch(url, options);
      if (options?.method === 'POST') {
        if (options.headers['X-Studio-CSRF'] !== 'fixture-csrf') throw new Error('Missing CSRF token');
        const body = JSON.parse(options.body); const state = window.studioFixture;
        if (body.action === 'setup') { state.configured = true; state.unlocked = true; }
        if (body.action === 'preferences') state.preferences = {model:body.model,effort:body.effort,fast:body.fast};
        if (body.action === 'password') state.passwordChanged = true;
        if (body.action === 'unlock') state.unlocked = true;
        if (body.action === 'connect') state.login = {verificationUrl:'https://auth.openai.com/codex/device',userCode:'TEST-CODE'};
        if (body.action === 'lock') state.unlocked = false;
        if (body.action === 'clear') delete state.job;
        if (body.action === 'generate') {
          window.studioRequests.push(body);
          state.job = {id:'fixture',status:'completed',sources:body.sources,result:{intro:'A small collection of ideas worth your time.',items:body.sources.slice(0,2).map(source=>({sourceId:source.id,headline:source.title,summary:'A fresh perspective from your selected communities. This preview demonstrates the source-linked briefing layout.',reason:'Selected for its relevance to your interests and a different perspective.'}))}};
        }
        return new Response(JSON.stringify({ok:true}));
      }
      return new Response(JSON.stringify(window.studioFixture));
    }; return true;
  })()`);
  run(
    "fill",
    ".studio-onboarding label:first-of-type input",
    "fixture-owner-password",
  );
  run(
    "fill",
    ".studio-onboarding label:last-of-type input",
    "fixture-owner-password",
  );
  click("Create private Studio");
  wait("document.querySelector('.studio-compose')");
  click("Connect");
  wait("document.querySelector('.studio-device')");
  check(
    "document.querySelector('.studio-device a').href === 'https://auth.openai.com/codex/device'",
    "OAuth setup shows official verification link and code",
  );
  evaluate("studioFixture.connected=true; delete studioFixture.login; true");
  click("Refresh connection");
  wait(
    "document.querySelector('.studio-status').textContent.includes('Codex connected')",
  );
  click("Save model preferences");
  wait(
    "document.querySelector('.studio-notice')?.textContent.includes('saved')",
  );
  check(
    "studioFixture.preferences.model === 'gpt-5.6-luna' && document.querySelector('.studio-notice').textContent.includes('saved')",
    "Model preferences can be saved through the UI",
  );
  run("click", ".studio-settings summary");
  run(
    "fill",
    ".studio-settings label:first-child input",
    "fixture-owner-password",
  );
  run(
    "fill",
    ".studio-settings label:nth-child(2) input",
    "fixture-new-password",
  );
  click("Change owner password");
  wait(
    "document.querySelector('.studio-notice')?.textContent.includes('Password changed')",
  );
  check(
    "studioFixture.passwordChanged && document.querySelector('.studio-notice').textContent.includes('Password changed')",
    "Owner password can be changed through the UI",
  );
  if (process.env.STUDIO_SCREENSHOTS) {
    evaluate(
      "document.querySelector('.studio-settings').scrollIntoView({block:'center'}); true",
    );
    run("wait", "300");
    run(
      "screenshot",
      path.resolve(".amp/in/artifacts/studio-owner-settings.png"),
    );
  }
  run("click", ".studio-settings summary");
  check(
    "document.querySelector('.studio-options select').value === 'gpt-5.6-luna'",
    "Model selection uses advertised OAuth model",
  );
  check(
    "document.querySelector('.studio-generate').disabled && studioRequests.length === 0",
    "No generation without reviewed sources and consent",
  );
  click("Preview sources");
  wait("document.querySelector('.studio-sources li')");
  check("studioRequests.length === 0", "Source preview never invokes AI");
  run("check", ".consent input");
  run("click", ".studio-sources li button");
  check(
    "!document.querySelector('.consent input').checked",
    "Excluding a source resets consent",
  );
  run("check", ".consent input");
  click("Create digest");
  wait("document.querySelector('.studio-output article')");
  check(
    "studioRequests[0].kind === 'digest' && document.querySelector('.studio-output a').getAttribute('href').startsWith('/r/')",
    "Digest displays only source-linked results",
  );
  evaluate("scrollTo(0,0); true");
  run("wait", "300");
  if (process.env.STUDIO_SCREENSHOTS)
    run("screenshot", path.resolve(".amp/in/artifacts/studio-desktop.png"));
  click("Interesting stories");
  wait(
    "document.querySelector('.studio-kind button[aria-pressed=true]').textContent === 'Interesting stories' && !document.querySelector('.studio-sources')",
  );
  check(
    "!document.querySelector('.studio-sources') && !document.querySelector('.consent input').checked",
    "Changing workflows clears stale sources and consent",
  );
  click("Preview sources");
  wait("document.querySelector('.studio-sources li')");
  run("check", ".consent input");
  click("Create story selection");
  wait("studioRequests.length === 2");
  check(
    "studioRequests[1].kind === 'stories'",
    "Story selection is its own workflow",
  );
  const communities = {
    data: {
      children: [
        {
          data: {
            display_name: "Design",
            name: "t5_design",
            title: "Thoughtful design",
            public_description: "Objects, spaces and ideas.",
          },
        },
        {
          data: {
            display_name: "Architecture",
            name: "t5_arch",
            public_description: "Buildings and public spaces.",
          },
        },
      ],
    },
  };
  run("network", "unroute", "*reddit.com*");
  run(
    "network",
    "route",
    "*reddit.com*",
    "--body",
    JSON.stringify(communities),
  );
  click("Suggest communities");
  run("fill", ".studio-compose textarea", "design");
  click("Preview sources");
  wait("document.querySelector('.studio-sources li')");
  run("check", ".consent input");
  click("Create suggestions");
  wait("studioRequests.length === 3");
  check(
    "studioRequests[2].kind === 'communities' && studioRequests[2].sources.every(s=>/^\\/r\\/[a-z]+$/i.test(s.url))",
    "Community suggestions use retrieved community candidates",
  );
  check(
    "!document.querySelector('.studio-kind').textContent.toLowerCase().includes('answer')",
    "Answer search is not exposed",
  );
  for (const width of [320, 390, 768, 1024]) {
    run("set", "viewport", String(width), "844");
    check(
      "document.documentElement.scrollWidth <= innerWidth",
      `${width}px Studio layout has no horizontal overflow`,
    );
  }
  run("set", "viewport", "390", "844");
  check(
    "document.querySelectorAll('.mobile-navigation a').length === 5 && document.querySelector('.mobile-navigation a[href=\"/studio\"]').getAttribute('aria-current') === 'page'",
    "PWA navigation includes a dedicated fifth Studio tab",
  );
  click("Toggle light and dark theme");
  evaluate(
    "document.querySelector('.studio-results').scrollIntoView({block:'start'}); true",
  );
  run("wait", "300");
  if (process.env.STUDIO_SCREENSHOTS)
    run("screenshot", path.resolve(".amp/in/artifacts/studio-mobile.png"));
  evaluate("scrollTo(0,document.documentElement.scrollHeight); true");
  run("wait", "300");
  check(
    "document.querySelector('.studio-output article:last-child a').getBoundingClientRect().bottom < document.querySelector('.mobile-navigation').getBoundingClientRect().top",
    "Last source link can scroll clear of the PWA tab bar",
  );
  evaluate(
    "studioFixture.job={id:'running',status:'running'}; studioFixture.busy=true; true",
  );
  click("Refresh connection");
  wait("document.querySelector('.studio-spin')");
  run("set", "media", "dark", "reduced-motion");
  check(
    "getComputedStyle(document.querySelector('.studio-spin')).animationName === 'none'",
    "Reduced motion disables generation spinner",
  );
  click("Lock");
  wait("document.querySelector('.studio-unlock')");
  check(
    "!document.querySelector('.studio-output')",
    "Lock hides private results",
  );
  console.log(`${checks} Studio browser checks passed`);
} finally {
  run("close");
}
