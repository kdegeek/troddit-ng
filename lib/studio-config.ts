import { mkdirSync, readFileSync, writeFileSync, renameSync } from "fs";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import path from "path";

export type StudioPreferences = {
  model: string;
  effort: string;
  fast: boolean;
};
export type StudioConfig = {
  salt: string;
  hash: string;
  preferences?: StudioPreferences;
};
const filename = () =>
  path.join(
    path.resolve(process.env.TRODDIT_CODEX_HOME || ".troddit-ai"),
    "studio-owner.json",
  );

export function readStudioConfig(): StudioConfig | null {
  try {
    const data = JSON.parse(readFileSync(filename(), "utf8"));
    if (!/^[a-f0-9]{32}$/.test(data.salt) || !/^[a-f0-9]{64}$/.test(data.hash))
      throw new Error("Invalid owner configuration.");
    return data;
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw new Error(
      "Studio could not read its private settings. Check the server storage; setup remains locked.",
    );
  }
}

export function passwordConfig(password: unknown): StudioConfig {
  if (
    typeof password !== "string" ||
    password.length < 12 ||
    password.length > 256
  )
    throw new Error("Use a password between 12 and 256 characters.");
  const salt = randomBytes(16).toString("hex");
  return { salt, hash: scryptSync(password, salt, 32).toString("hex") };
}

export function checkStudioPassword(config: StudioConfig, password: unknown) {
  return (
    typeof password === "string" &&
    password.length <= 256 &&
    timingSafeEqual(
      new Uint8Array(scryptSync(password, config.salt, 32)),
      new Uint8Array(Buffer.from(config.hash, "hex")),
    )
  );
}

export function saveStudioConfig(config: StudioConfig, first = false) {
  const file = filename();
  mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  if (first) {
    // Exclusive creation: two setup requests can never replace the first owner.
    try {
      writeFileSync(file, JSON.stringify(config), { mode: 0o600, flag: "wx" });
    } catch (error) {
      if (error.code === "EEXIST")
        throw new Error("Studio has already been set up. Unlock it instead.");
      throw error;
    }
  } else {
    const temporary = `${file}.tmp`;
    writeFileSync(temporary, JSON.stringify(config), { mode: 0o600 });
    renameSync(temporary, file);
  }
}
