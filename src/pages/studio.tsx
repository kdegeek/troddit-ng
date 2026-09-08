import Head from "next/head";
import Link from "next/link";
import React, {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSession } from "next-auth/react";
import {
  FiCheck,
  FiCpu,
  FiExternalLink,
  FiLock,
  FiRefreshCw,
  FiShield,
} from "react-icons/fi";
import { loadSubreddits, searchSubreddits } from "../RedditAPI";
import { useMainContext } from "../MainContext";
import { useTAuth } from "../PremiumAuthContext";

type Candidate = {
  id: string;
  title: string;
  text: string;
  url: string;
  subreddit: string;
};
type StudioState = {
  configured: boolean;
  unlocked: boolean;
  csrfToken?: string;
  preferences?: { model: string; effort: string; fast: boolean };
  connected?: boolean;
  busy?: boolean;
  models?: { id: string; efforts: string[]; fast?: boolean }[];
  limits?: {
    primary?: { usedPercent: number };
    secondary?: { usedPercent: number };
  };
  login?: { verificationUrl: string; userCode: string };
  job?: {
    id: string;
    status: "running" | "completed" | "failed" | "cancelled";
    result?: {
      intro: string;
      items: {
        sourceId: string;
        headline: string;
        summary: string;
        reason: string;
      }[];
    };
    sources?: Candidate[];
    error?: string;
  };
  error?: string;
};
type Kind = "digest" | "communities" | "stories";
const DEFAULT_COMMUNITIES = "Design,Outdoors,technology";
const clean = (value: unknown, max: number) =>
  String(value ?? "").slice(0, max);
const validName = (name: string) => /^[A-Za-z0-9_]{2,21}$/.test(name);
const validLocalSource = (source?: Candidate) => {
  if (!source || !validName(source.subreddit)) return false;
  const match = source.url.match(
    /^\/r\/([A-Za-z0-9_]{2,21})(?:\/comments\/[a-z0-9]+\/(?:[a-z0-9_-]+\/)?)?$/i,
  );
  return match?.[1].toLowerCase() === source.subreddit.toLowerCase();
};

export default function Studio() {
  const { data: session } = useSession();
  const context: any = useMainContext();
  const { premium } = useTAuth();
  const [state, setState] = useState<StudioState>();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [communities, setCommunities] = useState(DEFAULT_COMMUNITIES);
  const [interests, setInterests] = useState("");
  const [kind, setKind] = useState<Kind>("digest");
  const [model, setModel] = useState("");
  const [effort, setEffort] = useState("");
  const [fast, setFast] = useState(false);
  const [consent, setConsent] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [sources, setSources] = useState<Candidate[]>([]);

  useEffect(() => {
    setSources([]);
    setConsent(false);
  }, [kind, communities, interests, state?.unlocked]);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/studio", {
        credentials: "same-origin",
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Could not load AI Studio.");
      setState(data);
      setError(data.error || "");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not load AI Studio.",
      );
    }
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);
  useEffect(() => {
    if (!state?.unlocked || (!state.login && state.job?.status !== "running"))
      return;
    const timer = window.setInterval(refresh, 3000);
    return () => window.clearInterval(timer);
  }, [state?.unlocked, state?.login, state?.job?.status, refresh]);
  useEffect(() => {
    if (!state?.models?.length) return;
    if (!state.models.some((item) => item.id === model)) {
      const preferred =
        state.models.find((item) => item.id === state.preferences?.model) ||
        state.models.find((item) => item.id.toLowerCase().includes("luna")) ||
        state.models[0];
      setModel(preferred.id);
      setEffort(
        preferred.id === state.preferences?.model &&
          preferred.efforts.includes(state.preferences.effort)
          ? state.preferences.effort
          : preferred.efforts.includes("max")
            ? "max"
            : preferred.efforts[0] || "",
      );
      setFast(
        Boolean(
          preferred.fast &&
            preferred.id === state.preferences?.model &&
            state.preferences.fast,
        ),
      );
    }
  }, [state?.models, state?.preferences, model]);
  const selectedModel = state?.models?.find((item) => item.id === model);
  useEffect(() => {
    if (selectedModel && !selectedModel.efforts.includes(effort))
      setEffort(
        selectedModel.efforts.includes("max")
          ? "max"
          : selectedModel.efforts[0] || "",
      );
  }, [selectedModel, effort]);

  const post = async (body: object) => {
    setError("");
    setNotice("");
    setWorking(true);
    try {
      const response = await fetch("/api/studio", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "X-Studio-CSRF": state?.csrfToken || "",
        },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Request failed.");
      await refresh();
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Request failed.");
      return false;
    } finally {
      setWorking(false);
    }
  };

  const communityNames = useMemo(
    () =>
      communities
        .split(",")
        .map((name) => name.trim().replace(/^r\//i, ""))
        .filter(Boolean),
    [communities],
  );
  const buildSources = async (): Promise<Candidate[]> => {
    if (kind === "communities") {
      if (!interests.trim())
        throw new Error("Describe your interests to find communities.");
      const results: any[] = [];
      for (const query of interests
        .split(",")
        .map((text) => text.trim())
        .filter(Boolean)
        .slice(0, 3)) {
        const result = await searchSubreddits({
          query,
          over18: false,
          loggedIn: Boolean(session),
          token: context.token,
          isPremium: premium?.isPremium,
        });
        if (!result)
          throw new Error("Community search is unavailable. Try again later.");
        if (result.token) context.setToken(result.token);
        results.push(...(result.data || []));
      }
      return results
        .map((child: any) => child?.data)
        .filter(
          (data: any, index: number, all: any[]) =>
            data &&
            !data.over_18 &&
            data.subreddit_type !== "private" &&
            validName(data.display_name) &&
            all.findIndex(
              (item) => item?.display_name === data.display_name,
            ) === index,
        )
        .slice(0, 30)
        .map((data: any) => ({
          id: clean(data.name || `r-${data.display_name}`, 100),
          title: clean(
            data.display_name_prefixed || `r/${data.display_name}`,
            300,
          ),
          text: clean(data.public_description || data.title, 2000),
          url: `/r/${data.display_name}`,
          subreddit: clean(data.display_name, 100),
        }));
    }
    if (
      !communityNames.length ||
      communityNames.length > 10 ||
      communityNames.some((name) => !validName(name))
    )
      throw new Error(
        "Choose 1–10 comma-separated community names (letters, numbers, underscores).",
      );
    const result: any = await loadSubreddits({
      loggedIn: Boolean(session),
      token: context.token,
      subreddits: communityNames.join("+"),
      sort: "hot",
      range: "day",
      count: 0,
      sr_detail: true,
      isPremium: premium?.isPremium,
    });
    if (result?.token) context.setToken(result.token);
    return (result?.children || [])
      .map((child: any) => child?.data)
      .filter(
        (data: any) =>
          data &&
          !data.over_18 &&
          data.subreddit_type !== "private" &&
          validName(data.subreddit) &&
          /^[a-z0-9]+$/i.test(data.id || ""),
      )
      .slice(0, 30)
      .map((data: any) => ({
        id: clean(data.name || data.id, 100),
        title: clean(data.title, 300),
        text: clean(data.selftext || "", 2000),
        url: `/r/${data.subreddit}/comments/${data.id}/${
          String(data.title || "post")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")
            .slice(0, 80) || "post"
        }/`,
        subreddit: clean(data.subreddit, 100),
      }));
  };
  const prepare = async () => {
    setWorking(true);
    setError("");
    setSources([]);
    setConsent(false);
    try {
      const sources = await buildSources();
      if (!sources.length)
        throw new Error("No safe public sources were found.");
      setSources(sources.filter(validLocalSource));
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not prepare sources.",
      );
    } finally {
      setWorking(false);
    }
  };
  const generate = async () => {
    if (!consent || !sources.length)
      return setError("Preview sources and confirm consent first.");
    if (!model || !selectedModel?.efforts.includes(effort))
      return setError("Choose a supported model and effort.");
    await post({
      action: "generate",
      kind,
      interests: interests.trim(),
      model,
      effort,
      fast,
      sources,
    });
  };
  const sourceMap = new Map(
    (state?.job?.sources || [])
      .filter(validLocalSource)
      .map((source) => [source.id, source]),
  );

  return (
    <main className="studio-page">
      <Head>
        <title>troddit · AI Studio</title>
      </Head>
      <header className="studio-hero">
        <span className="studio-kicker">
          <FiCpu /> AI Studio
        </span>
        <h1>Turn Reddit into a thoughtful briefing.</h1>
        <p>
          Request a digest, discover communities, or surface interesting
          stories. You choose exactly what gets sent—nothing is sent
          automatically.
        </p>
      </header>
      {error && (
        <div className="studio-error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <p className="studio-notice" role="status">
          {notice}
        </p>
      )}
      {!state ? (
        <section className="studio-panel">Loading Studio…</section>
      ) : !state.configured ? (
        <form
          className="studio-panel studio-onboarding studio-unlock"
          onSubmit={(event) => {
            event.preventDefault();
            if (password !== confirmation)
              return setError("Passwords do not match.");
            post({ action: "setup", password }).then((ok) => {
              if (ok) {
                setPassword("");
                setConfirmation("");
                setNotice(
                  "Owner access created. Next, connect your ChatGPT account using Codex OAuth.",
                );
              }
            });
          }}
        >
          <FiShield />
          <div>
            <span className="studio-kicker">
              Step 1 of 2 · Your private Studio
            </span>
            <h2>Make this Studio yours.</h2>
            <p>
              Create an owner password, then connect with Codex OAuth. No API
              keys, environment variables, or configuration files to edit.
            </p>
            <p className="studio-help">
              The first person to finish setup becomes the Studio owner. Keep a
              new instance private until you complete this step.
            </p>
            <label>
              Choose an owner password
              <input
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={256}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <label>
              Confirm owner password
              <input
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={256}
                required
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
              />
            </label>
            <p className="studio-help">
              At least 12 characters. Use a password manager; there is no email
              password reset.
            </p>
            <button className="studio-primary" disabled={working}>
              Create private Studio
            </button>
          </div>
        </form>
      ) : !state.unlocked ? (
        <form
          className="studio-panel studio-unlock"
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            post({ action: "unlock", password }).then(
              (ok) => ok && setPassword(""),
            );
          }}
        >
          <FiLock />
          <div>
            <h2>Owner access</h2>
            <p>
              Unlock this private workspace. Your password is used for this
              request only. Troddit does not save it in browser storage.
            </p>
            <label>
              Studio password
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            <button className="studio-primary" disabled={working}>
              Unlock Studio
            </button>
          </div>
        </form>
      ) : (
        <>
          <section className="studio-status">
            <div>
              <span
                className={`studio-dot ${state.connected ? "connected" : ""}`}
              />{" "}
              <strong>
                {state.connected ? "Codex connected" : "Connect Codex"}
              </strong>
              <p>
                {state.connected
                  ? "Ready for an owner-initiated request."
                  : "Authenticate with Codex OAuth to generate results."}
              </p>
              {state.limits?.primary && (
                <p className="studio-quota">
                  Current quota window:{" "}
                  {Math.round(state.limits.primary.usedPercent)}% used.
                  {state.limits.secondary
                    ? ` Longer window: ${Math.round(state.limits.secondary.usedPercent)}% used.`
                    : ""}
                </p>
              )}
            </div>
            <div className="studio-actions">
              <button
                onClick={refresh}
                disabled={working}
                aria-label="Refresh connection"
              >
                <FiRefreshCw /> Refresh
              </button>
              {state.connected ? (
                <button
                  onClick={() => post({ action: "disconnect" })}
                  disabled={working}
                >
                  Disconnect
                </button>
              ) : (
                <button
                  className="studio-primary"
                  onClick={() => post({ action: "connect" })}
                  disabled={working}
                >
                  Connect
                </button>
              )}
              <button
                disabled={working}
                onClick={() => post({ action: "lock" })}
              >
                Lock
              </button>
            </div>
          </section>
          <details className="studio-panel studio-settings">
            <summary>Studio settings · owner password</summary>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                post({
                  action: "password",
                  currentPassword,
                  password: newPassword,
                }).then((ok) => {
                  if (ok) {
                    setCurrentPassword("");
                    setNewPassword("");
                    setNotice(
                      "Password changed. Other browser sessions have been signed out.",
                    );
                  }
                });
              }}
            >
              <label>
                Current owner password
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                />
              </label>
              <label>
                New owner password
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={256}
                  required
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
              </label>
              <button disabled={working}>Change owner password</button>
            </form>
          </details>
          {state.login && (
            <section className="studio-panel studio-device">
              <div>
                <span>1</span>
                <p>Open the secure verification page</p>
                <a
                  href={state.login.verificationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Continue to Codex <FiExternalLink />
                </a>
              </div>
              <div>
                <span>2</span>
                <p>Enter this one-time code</p>
                <strong>{state.login.userCode}</strong>
              </div>
            </section>
          )}
          <section className="studio-workspace">
            <div className="studio-panel studio-compose">
              <div className="studio-heading">
                <div>
                  <span>New request</span>
                  <h2>What should Studio create?</h2>
                </div>
                <span className="studio-private">
                  <FiShield /> Explicit consent
                </span>
              </div>
              <div
                className="studio-kind"
                role="group"
                aria-label="Request type"
              >
                {(
                  [
                    ["digest", "Daily digest"],
                    ["communities", "Suggest communities"],
                    ["stories", "Interesting stories"],
                  ] as [Kind, string][]
                ).map(([value, label]) => (
                  <button
                    key={value}
                    aria-pressed={kind === value}
                    disabled={working}
                    onClick={() => setKind(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <label>
                {kind === "communities"
                  ? "Seed communities (not sent for this request)"
                  : "Communities"}
                <input
                  value={communities}
                  onChange={(event) => setCommunities(event.target.value)}
                  placeholder={DEFAULT_COMMUNITIES}
                  disabled={working || kind === "communities"}
                />
              </label>
              <label>
                Interests <span>{interests.length}/500</span>
                <textarea
                  maxLength={500}
                  disabled={working}
                  value={interests}
                  onChange={(event) => setInterests(event.target.value)}
                  placeholder="e.g. architecture, hiking, sustainable technology"
                />
              </label>
              <button
                className="studio-preview-button"
                onClick={prepare}
                disabled={working || state.busy}
              >
                Preview sources
              </button>
              <p className="studio-help">
                Loads up to 30 Reddit titles and excerpts, not full articles or
                comments. For community discovery, enter up to three
                comma-separated search topics.
              </p>
              {!!sources.length && (
                <details className="studio-sources" open>
                  <summary>{sources.length} sources ready to send</summary>
                  <ul>
                    {sources.map((source) => (
                      <li key={source.id}>
                        <Link href={source.url}>{source.title}</Link>
                        <p>
                          {source.text ||
                            "Title only — no article or video content."}
                        </p>
                        <button
                          onClick={() => {
                            setSources(
                              sources.filter((item) => item.id !== source.id),
                            );
                            setConsent(false);
                          }}
                          disabled={working}
                          aria-label={`Exclude ${source.title}`}
                        >
                          Exclude
                        </button>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              <div className="studio-options">
                <label>
                  Model
                  <select
                    value={model}
                    onChange={(event) => {
                      setModel(event.target.value);
                      setFast(false);
                    }}
                  >
                    {state.models?.map((item) => (
                      <option key={item.id}>{item.id}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Reasoning effort
                  <select
                    value={effort}
                    onChange={(event) => setEffort(event.target.value)}
                  >
                    {selectedModel?.efforts.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="studio-check">
                <input
                  type="checkbox"
                  checked={fast}
                  disabled={!selectedModel?.fast || working}
                  onChange={(event) => setFast(event.target.checked)}
                />
                <span>
                  <strong>Fast mode</strong> May spend quota faster and is not
                  supported by every model.{" "}
                  {selectedModel?.fast
                    ? "Available for this model."
                    : "Not advertised for this model."}{" "}
                  Studio will not silently fall back.
                </span>
              </label>
              <button
                disabled={working || !model || !effort}
                onClick={() =>
                  post({ action: "preferences", model, effort, fast }).then(
                    (ok) =>
                      ok &&
                      setNotice("Model preferences saved for future visits."),
                  )
                }
              >
                Save model preferences
              </button>
              <label className="studio-check consent">
                <input
                  type="checkbox"
                  checked={consent}
                  disabled={!sources.length || working}
                  onChange={(event) => setConsent(event.target.checked)}
                />
                <span>
                  I consent to sending the interests and selected Reddit source
                  text previewed above to OpenAI. Reddit credentials are never
                  included. Check excerpts for personal information before
                  sending.
                </span>
              </label>
              <button
                className="studio-primary studio-generate"
                onClick={generate}
                disabled={
                  working ||
                  !state.connected ||
                  state.busy ||
                  !consent ||
                  !sources.length
                }
              >
                {state.job?.status === "running"
                  ? "Generating…"
                  : `Create ${kind === "digest" ? "digest" : kind === "communities" ? "suggestions" : "story selection"}`}
              </button>
              {state.job?.status === "running" && (
                <button
                  className="studio-cancel"
                  onClick={() => post({ action: "cancel" })}
                >
                  Cancel request
                </button>
              )}
            </div>
            <div className="studio-results">
              <div className="studio-results-head">
                <div>
                  <span>Latest output</span>
                  <h2>
                    {state.job?.status === "completed"
                      ? "Your briefing"
                      : "Results appear here"}
                  </h2>
                </div>
                {state.job && (
                  <button
                    disabled={working || state.busy}
                    onClick={() => post({ action: "clear" })}
                  >
                    Clear
                  </button>
                )}
              </div>
              {state.job?.status === "cancelled" && (
                <p role="status">
                  Request cancelled. Work already performed may count toward
                  your quota.
                </p>
              )}
              {state.job?.status === "failed" && (
                <div className="studio-error" role="alert">
                  {state.job.error || "Generation failed."}
                </div>
              )}
              {state.job?.status === "running" && (
                <div className="studio-empty" role="status">
                  <FiRefreshCw className="studio-spin" />
                  <p>Working from the sources you approved…</p>
                </div>
              )}
              {state.job?.result ? (
                <div className="studio-output">
                  <p className="studio-intro">{state.job.result.intro}</p>
                  {state.job.result.items.map((item, index) => {
                    const source = sourceMap.get(item.sourceId);
                    return (
                      <article key={`${item.sourceId}-${index}`}>
                        <span className="studio-ai-label">
                          <FiCheck /> AI-generated · verify sources
                        </span>
                        <h3>{item.headline}</h3>
                        <p>{item.summary}</p>
                        <p className="studio-reason">
                          Why it matters: {item.reason}
                        </p>
                        {source && (
                          <Link href={source.url}>
                            r/{source.subreddit} · View source
                          </Link>
                        )}
                      </article>
                    );
                  })}
                </div>
              ) : (
                state.job?.status !== "running" && (
                  <div className="studio-empty">
                    <FiCpu />
                    <p>
                      Start a request when you’re ready. No scheduled or
                      automatic generation. An active request continues if you
                      leave this tab. Only the latest result is kept, for up to
                      12 hours or until the server restarts.
                    </p>
                  </div>
                )
              )}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
