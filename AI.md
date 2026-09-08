# AI Studio (personal, OAuth-only)

AI Studio lives at `/studio`, in the desktop sidebar and mobile/PWA navigation.
It offers digests, community suggestions and interesting-story selections. It
does not implement answer search or inject AI content into your normal feeds.

## Configure everything in AI Studio

1. Open `/studio` over HTTPS (HTTP is allowed on localhost for development).
   Create and confirm an owner password of at least 12 characters in the setup
   wizard. **The first person to finish setup owns Studio: keep a new instance
   private until you complete this step.** Setup cannot overwrite an existing owner.
2. Choose **Connect** and finish the official OpenAI device-code OAuth flow in
   your browser. Enable device-code login in your ChatGPT security settings if
   OpenAI requires it. Never paste OAuth tokens or API keys into Troddit.
3. Select your model, reasoning effort and Fast preference, then choose **Save
   model preferences**. Settings persist across app restarts and browser visits.
4. Use **Studio settings** to change your password (requires the current password;
   other browser sessions are revoked), or **Disconnect** to sign out of Codex.
   Use a password manager: there is no email password reset or public reset endpoint.

No AI environment variables, CLI login, or hand-edited configuration files are
required. Codex **0.153.4** is bundled through normal dependency installation and
in the Docker image. The owner password is stored only as a salted scrypt hash;
model preferences and OAuth credentials stay in private server storage.

### Deployment notes (not AI configuration)

Use a single long-lived Node 22 server or the supplied Docker/Compose setup.
Serverless functions and multi-replica deployments are not supported. Compose
already persists private storage at `/var/lib/troddit-codex`; standalone Docker
runs need `-v codex-oauth:/var/lib/troddit-codex`. Native installs use `.troddit-ai`
in the app directory. Keep this directory writable, private and out of backups
you share publicly. Do not delete the volume unless you intend to remove owner
settings and OAuth credentials. Optional `TRODDIT_CODEX_HOME`/`TRODDIT_CODEX_BIN`
overrides exist for custom hosting/testing, but aren't needed for normal setup.
Never use an existing personal Codex directory with plugins, MCP servers or secrets.

Reverse proxies must preserve cookies, Origin and the `X-Studio-CSRF` header.
No public-origin setting is needed: mutations require a browser-bound security
token from Studio. Do not cache `/api/studio` responses or expose Codex itself;
Troddit uses private stdio. A VPN/access proxy is recommended for personal hosting.

## Use

- Choose a digest, community suggestions, or interesting stories. For posts,
  choose 1–10 communities; Studio uses their current hot listing. For community
  discovery, enter up to three comma-separated search topics in Interests.
- **Preview sources** fetches Reddit results through Troddit's existing API flow.
  It does not invoke AI. Review the bounded text excerpts and exclude anything
  you do not want sent. NSFW and explicitly private results are excluded.
- Select a model and reasoning effort advertised by your OAuth account. Luna and
  `max` are preferred when available. Fast is enabled only when advertised and
  requires an explicit choice; it can consume subscription quota faster.
- Check consent and create the result. Each item links to a supplied source and
  explains its selection. This is synthesis of titles/excerpts, **not a claim to
  have read full articles, videos or comments**. Recommendations are constrained
  to returned communities, not invented subreddit names. Activity isn't verified.
- The quota display reflects Codex's current/longer usage windows when available.
  There is **no API-key, alternative-model, or paid fallback**, nor automatic retry.
- One request runs at a time; additional work is rejected rather than queued.
  Cancel stops the local worker; work already performed may still count toward quota.
  Requests time out after ten minutes. Leaving the tab does not cancel an active
  request. No recurring or automatic jobs are configured.
- Only the latest result and its sources are retained in server memory, for up to
  twelve hours (expired on access), until Clear/Disconnect, or until restart. A
  new request replaces the previous result. This is not a persistent archive or
  an offline reader. Copy anything you want to keep before clearing or restarting.

## Security and limitations

Owner access uses a separate password, not your Reddit login, a 12-hour HttpOnly
SameSite cookie, synchronizer-token CSRF protection, and bounded password attempts. Lock
revokes this browser's session; Disconnect logs out Codex and clears the result.
The single OAuth account is shared across the owner's unlocked browsers; this is
not a multi-user AI service. Restart revokes all owner sessions.

OAuth credentials are persisted by Codex in its dedicated directory. Treat that
directory/volume as a password. Never share or commit it. The worker receives an
allow-listed environment, not Reddit or application secrets. Shell execution,
browser use, apps, multi-agent tools, hooks and web search are disabled, and turns
have restricted read-only access to an empty working directory. Approval/tool
requests are rejected. Use a dedicated container/OS account as defense in depth;
this is not a generic agent execution endpoint.

Interests and approved Reddit excerpts are sent to OpenAI under your ChatGPT
account's data controls. Source text can contain personal information or embedded
URLs; preview before sending. Prompt instructions and output validation reduce
injection and invented-citation risks, but do not guarantee factual accuracy.
AI output is escaped plain text, not HTML; links come only from validated input.
No OAuth token or provider error body is returned to the PWA. API responses are
`private, no-store`, and the PWA service worker does not cache API requests.

Codex app-server is an **experimental upstream interface**. Pinning the version
limits drift but does not guarantee availability, entitlement, or model quality.
Actual subscription sign-in and generation must be tested with your account;
automated tests use protocol fixtures and cannot certify subscription behavior.
The application does not bypass OpenAI quotas or account policies.

References: [App Server](https://developers.openai.com/codex/app-server),
[authentication](https://developers.openai.com/codex/auth),
[configuration](https://developers.openai.com/codex/config-reference).
