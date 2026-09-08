import type { NextApiRequest, NextApiResponse } from "next";
import { randomBytes } from "crypto";
import { studioWorker } from "../../../lib/studio-server";
import { validateRequest } from "../../../lib/studio";
import {
  readStudioConfig,
  passwordConfig,
  checkStudioPassword,
  saveStudioConfig,
} from "../../../lib/studio-config";

export const config = { api: { bodyParser: { sizeLimit: "96kb" } } };
const globalAuth = globalThis as typeof globalThis & {
  studioUIAuth?: {
    sessions: Map<string, number>;
    csrf: Map<string, number>;
    attempts: number;
    window: number;
    acting: boolean;
  };
};
const auth = (globalAuth.studioUIAuth ||= {
  sessions: new Map(),
  csrf: new Map(),
  attempts: 0,
  window: 0,
  acting: false,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Vary", "Cookie");
  let owner;
  try {
    owner = readStudioConfig();
  } catch (error) {
    return res.status(503).json({ error: error.message });
  }
  for (const collection of [auth.sessions, auth.csrf])
    for (const [key, expires] of collection)
      if (expires < Date.now()) collection.delete(key);
  const token = req.cookies.troddit_studio || "";
  const unlocked = Boolean(owner && auth.sessions.has(token));
  const secure =
    req.headers.origin?.startsWith("https:") ||
    req.headers["x-forwarded-proto"] === "https" ||
    Boolean((req.socket as any)?.encrypted);
  const cookie = (name: string, value: string, age: number) =>
    res.setHeader(
      "Set-Cookie",
      `${name}=${value}; Path=/api/studio; HttpOnly; SameSite=Strict; Max-Age=${age}${secure ? "; Secure" : ""}`,
    );
  if (req.method === "GET") {
    let csrfToken = req.cookies.troddit_studio_csrf;
    if (!csrfToken || !auth.csrf.has(csrfToken)) {
      csrfToken = randomBytes(32).toString("hex");
      if (auth.csrf.size >= 256)
        auth.csrf.delete(auth.csrf.keys().next().value);
      auth.csrf.set(csrfToken, Date.now() + 12 * 60 * 60 * 1000);
      cookie("troddit_studio_csrf", csrfToken, 12 * 60 * 60);
    }
    const base = { configured: Boolean(owner), unlocked, csrfToken };
    if (!unlocked) return res.json(base);
    const privateState = { ...base, preferences: owner.preferences };
    try {
      return res.json({ ...privateState, ...(await studioWorker.status()) });
    } catch {
      return res.json({
        ...privateState,
        connected: false,
        models: [],
        job: studioWorker.job,
        busy: studioWorker.job?.status === "running",
        error:
          "The bundled Codex worker is unavailable. Check the app installation and private storage, then refresh. No API fallback is configured.",
      });
    }
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed." });
  }
  // A server-issued synchronizer token is readable only by this origin. No
  // trusted-origin environment setting or forwarded-host trust is necessary.
  const csrfToken = req.cookies.troddit_studio_csrf;
  if (
    !csrfToken ||
    !auth.csrf.has(csrfToken) ||
    req.headers["x-studio-csrf"] !== csrfToken ||
    req.headers["sec-fetch-site"] === "cross-site" ||
    !req.headers["content-type"]?.startsWith("application/json")
  )
    return res
      .status(403)
      .json({
        error: "Reload AI Studio before trying again (security token expired).",
      });
  try {
    const origin = new URL(req.headers.origin || "");
    if (
      origin.protocol !== "https:" &&
      !(
        origin.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname)
      )
    )
      throw new Error();
  } catch {
    return res
      .status(403)
      .json({
        error:
          "Use HTTPS to configure Studio (HTTP is allowed only on localhost).",
      });
  }
  const action = req.body?.action;
  if (["setup", "unlock", "password"].includes(action)) {
    if (Date.now() - auth.window > 60000) {
      auth.attempts = 0;
      auth.window = Date.now();
    }
    if (++auth.attempts > 5) {
      res.setHeader("Retry-After", "60");
      return res
        .status(429)
        .json({ error: "Too many password attempts. Wait a minute." });
    }
  }
  const grant = () => {
    const session = randomBytes(32).toString("hex");
    if (auth.sessions.size >= 8)
      auth.sessions.delete(auth.sessions.keys().next().value);
    auth.sessions.set(session, Date.now() + 12 * 60 * 60 * 1000);
    cookie("troddit_studio", session, 12 * 60 * 60);
  };
  if (action === "unlock") {
    if (!owner || !checkStudioPassword(owner, req.body.password))
      return res.status(401).json({ error: "Incorrect Studio password." });
    grant();
    return res.json({ ok: true });
  }
  if (action !== "setup" && !unlocked)
    return res.status(401).json({ error: "Unlock Studio first." });
  if (auth.acting)
    return res
      .status(409)
      .json({ error: "A Studio operation is in progress. Try again shortly." });
  auth.acting = true;
  try {
    if (action === "setup") {
      if (owner)
        return res
          .status(409)
          .json({ error: "Studio already has an owner. Unlock it instead." });
      saveStudioConfig(passwordConfig(req.body.password), true);
      grant();
    } else if (action === "password") {
      if (!checkStudioPassword(owner, req.body.currentPassword))
        return res
          .status(401)
          .json({ error: "Current password is incorrect." });
      saveStudioConfig({
        ...passwordConfig(req.body.password),
        preferences: owner.preferences,
      });
      auth.sessions.clear();
      grant();
    } else if (action === "preferences") {
      const { model, effort, fast } = req.body;
      if (
        typeof model !== "string" ||
        !model ||
        model.length > 100 ||
        typeof effort !== "string" ||
        effort.length > 20 ||
        typeof fast !== "boolean"
      )
        throw new Error("Choose valid model preferences.");
      saveStudioConfig({ ...owner, preferences: { model, effort, fast } });
    } else if (action === "lock") {
      auth.sessions.delete(token);
      cookie("troddit_studio", "", 0);
    } else if (action === "connect") await studioWorker.connect();
    else if (action === "disconnect") await studioWorker.disconnect();
    else if (action === "cancel") studioWorker.cancel();
    else if (action === "clear") {
      if (studioWorker.job?.status === "running")
        throw new Error("Cancel the active request before clearing.");
      studioWorker.job = undefined;
    } else if (action === "generate")
      await studioWorker.generate(validateRequest(req.body));
    else return res.status(400).json({ error: "Unknown Studio action." });
    return res.json({ ok: true });
  } catch (error) {
    return res
      .status(400)
      .json({
        error:
          error instanceof Error &&
          !/ENOENT|EACCES|mkdir|spawn|open|rename/.test(error.message)
            ? error.message
            : "Studio could not save or load private settings. Check the app's writable storage.",
      });
  } finally {
    auth.acting = false;
  }
}
