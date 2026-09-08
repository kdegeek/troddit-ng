import localForage from "localforage";
import {
  APPEARANCE_KEY,
  Appearance,
  PALETTES,
  validateAppearance,
} from "./appearance";

export const PREFERENCE_EXPORT_VERSION = 1;

// This is deliberately an allow-list. Authentication, caches, read history and
// arbitrary localStorage values must never become part of a portable backup.
export const PREFERENCE_KEYS = [
  "nsfw",
  "autoplay",
  "hoverplay",
  "mediaOnly",
  "audioOnHover",
  "columnOverride",
  "saveWideUI",
  "syncWideUI",
  "postWideUI",
  "wideUI",
  "cardStyle",
  "imgFilter",
  "imgPortraitFilter",
  "imgLandscapeFilter",
  "vidFilter",
  "linkFilter",
  "selfFilter",
  "readFilter",
  "seenFilter",
  "ribbonCollapseOnly",
  "collapseChildrenOnly",
  "defaultCollapseChildren",
  "showUserIcons",
  "showAwardings",
  "showFlairs",
  "showUserFlairs",
  "expandedSubPane",
  "infiniteLoading",
  "dimRead",
  "autoRead",
  "autoSeen",
  "disableEmbeds",
  "preferEmbeds",
  "embedsEverywhere",
  "expandImages",
  "autoRefreshFeed",
  "autoRefreshComments",
  "askToUpdateFeed",
  "refreshOnFocus",
  "uniformHeights",
  "compactLinkPics",
  "autoHideNav",
  "preferSideBySide",
  "disableSideBySide",
  "autoCollapseComments",
  "waitForVidInterval",
  "fastRefreshInterval",
  "slowRefreshInterval",
  "autoPlayInterval",
  "defaultSortComments",
  "volume",
] as const;

export const COLLECTION_KEYS = [
  "localSubs",
  "localFavoriteSubs",
  "myLocalMultis",
] as const;
const BOOLEAN_KEYS = new Set(
  PREFERENCE_KEYS.filter(
    (key) =>
      ![
        "columnOverride",
        "cardStyle",
        "fastRefreshInterval",
        "slowRefreshInterval",
        "autoPlayInterval",
        "defaultSortComments",
        "volume",
      ].includes(key),
  ),
);
const NUMBER_KEYS = new Set([
  "fastRefreshInterval",
  "slowRefreshInterval",
  "autoPlayInterval",
  "volume",
]);
const CARD_STYLES = new Set(["default", "card1", "card2", "row1"]);
const THEMES = new Set(["system", ...Object.keys(PALETTES)]);

export type PreferenceBackup = {
  kind: "troddit-preferences";
  version: 1;
  exportedAt?: string;
  preferences: Record<string, unknown>;
  collections: Record<string, unknown>;
  theme?: string;
  appearance?: Appearance;
};

const plainObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

export function validatePreferenceBackup(input: unknown): PreferenceBackup {
  if (!plainObject(input)) throw new Error("Backup must be a JSON object.");
  if (input.kind !== "troddit-preferences")
    throw new Error("This is not a Troddit preferences backup.");
  if (input.version !== PREFERENCE_EXPORT_VERSION)
    throw new Error(`Unsupported backup version: ${String(input.version)}.`);
  for (const bucket of ["preferences", "collections"]) {
    if (input[bucket] !== undefined && !plainObject(input[bucket]))
      throw new Error(`Invalid ${bucket}: expected an object.`);
  }
  const sourcePreferences = plainObject(input.preferences)
    ? input.preferences
    : {};
  const sourceCollections = plainObject(input.collections)
    ? input.collections
    : {};
  const preferences: Record<string, unknown> = {};
  for (const key of PREFERENCE_KEYS) {
    const value = sourcePreferences[key];
    if (value === undefined) continue;
    const valid = BOOLEAN_KEYS.has(key)
      ? typeof value === "boolean"
      : key === "volume"
        ? typeof value === "number" &&
          Number.isFinite(value) &&
          value >= 0 &&
          value <= 1
        : key === "fastRefreshInterval" || key === "slowRefreshInterval"
          ? typeof value === "number" &&
            Number.isFinite(value) &&
            value >= 10_000
          : key === "autoPlayInterval"
            ? typeof value === "number" && Number.isFinite(value) && value >= 1
            : NUMBER_KEYS.has(key)
              ? typeof value === "number" && Number.isFinite(value)
              : key === "columnOverride"
                ? [0, 1, 2, 3, 4, 5, 7].includes(value as number)
                : key === "cardStyle"
                  ? CARD_STYLES.has(value as string)
                  : typeof value === "string";
    if (!valid) throw new Error(`Invalid value for preference “${key}”.`);
    preferences[key] = value;
  }
  const collections: Record<string, unknown> = {};
  for (const key of COLLECTION_KEYS) {
    const value = sourceCollections[key];
    if (value === undefined) continue;
    if (!Array.isArray(value)) throw new Error(`Invalid collection “${key}”.`);
    const valid =
      key === "localSubs" || key === "localFavoriteSubs"
        ? value.every((item) => typeof item === "string")
        : value.every(
            (multi) =>
              plainObject(multi) &&
              plainObject(multi.data) &&
              typeof multi.data.name === "string" &&
              typeof multi.data.display_name === "string" &&
              Array.isArray(multi.data.subreddits) &&
              multi.data.subreddits.every(
                (sub) => plainObject(sub) && typeof sub.name === "string",
              ),
          );
    if (!valid) throw new Error(`Invalid collection “${key}”.`);
    // Ensure imported IndexedDB data is JSON data, not exotic objects.
    collections[key] = JSON.parse(JSON.stringify(value));
  }
  const theme = typeof input.theme === "string" ? input.theme : undefined;
  if (input.theme !== undefined && (!theme || !THEMES.has(theme)))
    throw new Error("Invalid theme.");
  const exportedAt =
    typeof input.exportedAt === "string" ? input.exportedAt : undefined;
  return {
    kind: "troddit-preferences",
    version: 1,
    preferences,
    collections,
    ...(exportedAt ? { exportedAt } : {}),
    ...(theme ? { theme } : {}),
    ...(input.appearance !== undefined
      ? { appearance: validateAppearance(input.appearance) }
      : {}),
  };
}

export async function exportPreferences(): Promise<PreferenceBackup> {
  const preferences: Record<string, unknown> = {};
  const collections: Record<string, unknown> = {};
  await Promise.all(
    PREFERENCE_KEYS.map(async (key) => {
      const value = await localForage.getItem(key);
      if (value !== null) preferences[key] = value;
    }),
  );
  await Promise.all(
    COLLECTION_KEYS.map(async (key) => {
      const value = await localForage.getItem(key);
      if (value !== null) collections[key] = value;
    }),
  );
  const theme =
    typeof window !== "undefined" ? window.localStorage.getItem("theme") : null;
  const appearance =
    typeof window !== "undefined"
      ? window.localStorage.getItem(APPEARANCE_KEY)
      : null;
  return validatePreferenceBackup({
    kind: "troddit-preferences",
    version: 1,
    exportedAt: new Date().toISOString(),
    preferences,
    collections,
    ...(theme ? { theme } : {}),
    ...(appearance ? { appearance: JSON.parse(appearance) } : {}),
  });
}

export async function importPreferences(input: unknown): Promise<void> {
  const backup = validatePreferenceBackup(input);
  // Missing values are intentionally untouched: importing a partial backup
  // must not reset existing preferences or collections to defaults.
  await Promise.all(
    Object.entries({ ...backup.preferences, ...backup.collections }).map(
      ([key, value]) => localForage.setItem(key, value),
    ),
  );
  if (backup.theme && typeof window !== "undefined")
    window.localStorage.setItem("theme", backup.theme);
  if (backup.appearance && typeof window !== "undefined")
    window.localStorage.setItem(
      APPEARANCE_KEY,
      JSON.stringify(backup.appearance),
    );
}
