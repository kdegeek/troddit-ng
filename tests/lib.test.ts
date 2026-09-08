import assert from "node:assert/strict";
import test from "node:test";
import localForage from "localforage";
import {
  importPreferences,
  validatePreferenceBackup,
} from "../lib/preferences";
import {
  getViewMode,
  layoutPreset,
  viewPreset,
} from "../lib/reading-preferences";
import { draftKey, loadDraft, saveDraft } from "../lib/drafts";
import { constructMultiLink } from "../lib/navigation";

const backup = (overrides: Record<string, unknown> = {}) => ({
  kind: "troddit-preferences",
  version: 1,
  preferences: {},
  collections: {},
  ...overrides,
});

test("preferences only retain allow-listed settings and collections", () => {
  const result = validatePreferenceBackup(
    backup({
      preferences: { nsfw: true, volume: 0.25, token: "secret" },
      collections: {
        localSubs: ["typescript"],
        localFavoriteSubs: ["webdev"],
        myLocalMultis: [
          {
            data: {
              name: "Code",
              display_name: "Code",
              subreddits: [{ name: "typescript" }],
            },
          },
        ],
        history: ["post"],
      },
    }),
  );
  assert.deepEqual(result.preferences, { nsfw: true, volume: 0.25 });
  assert.deepEqual(Object.keys(result.collections), [
    "localSubs",
    "localFavoriteSubs",
    "myLocalMultis",
  ]);
});

test("preferences reject invalid identity, values, and collection shapes", () => {
  for (const value of [
    backup({ kind: undefined }),
    backup({ version: undefined }),
    backup({ version: 2 }),
    backup({ preferences: [] }),
    backup({ collections: "invalid" }),
  ])
    assert.throws(() => validatePreferenceBackup(value));
  for (const preferences of [
    { nsfw: "yes" },
    { volume: 1.1 },
    { volume: NaN },
    { fastRefreshInterval: 9_999 },
    { slowRefreshInterval: Infinity },
    { autoPlayInterval: 0 },
    { columnOverride: 6 },
    { cardStyle: "huge" },
  ])
    assert.throws(() => validatePreferenceBackup(backup({ preferences })));
  for (const collections of [
    { localSubs: ["ok", 1] },
    { localFavoriteSubs: {} },
    {
      myLocalMultis: [
        { data: { name: "x", display_name: "x", subreddits: ["bad"] } },
      ],
    },
  ])
    assert.throws(() => validatePreferenceBackup(backup({ collections })));
});

test("partial preference imports only write supplied allow-listed values", async () => {
  const original = localForage.setItem;
  const writes: [string, unknown][] = [];
  localForage.setItem = (async (key: string, value: unknown) => {
    writes.push([key, value]);
    return value;
  }) as typeof localForage.setItem;
  try {
    await importPreferences(
      backup({
        preferences: { nsfw: false, unknown: true },
        collections: { localSubs: ["a"] },
      }),
    );
    assert.deepEqual(writes, [
      ["nsfw", false],
      ["localSubs", ["a"]],
    ]);
  } finally {
    localForage.setItem = original;
  }
});

test("reading preference presets map onto persisted settings", () => {
  assert.equal(getViewMode({ mediaOnly: true, cardStyle: "row1" }), "gallery");
  assert.equal(getViewMode({ cardStyle: "card2" }), "compact");
  assert.equal(getViewMode({ cardStyle: "card1" }), "reader");
  assert.deepEqual(viewPreset("gallery"), {
    cardStyle: "card1",
    mediaOnly: true,
    columnOverride: 0,
  });
  assert.deepEqual(viewPreset("compact"), {
    cardStyle: "row1",
    mediaOnly: false,
    columnOverride: 1,
  });
  assert.deepEqual(layoutPreset("split"), {
    postWideUI: true,
    preferSideBySide: true,
    disableSideBySide: false,
  });
  assert.deepEqual(layoutPreset("stacked"), {
    postWideUI: false,
    preferSideBySide: false,
    disableSideBySide: true,
  });
});

test("draft keys isolate user, mode, parent, and post and encode separators", () => {
  const keys = [
    draftKey("a:b", "REPLY", "parent", "post"),
    draftKey("a", "REPLY", "parent", "post"),
    draftKey("a:b", "EDIT", "parent", "post"),
    draftKey("a:b", "REPLY", "other", "post"),
    draftKey("a:b", "REPLY", "parent", "other"),
  ];
  assert.equal(new Set(keys).size, keys.length);
  assert.match(keys[0], /a%3Ab/);
});

test("draft storage handles removal and storage failures", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
  };
  assert.equal(saveDraft(storage, "key", "draft"), true);
  assert.equal(loadDraft(storage, "key"), "draft");
  assert.equal(saveDraft(storage, "key", ""), true);
  assert.equal(loadDraft(storage, "key"), null);
  const broken = {
    getItem() {
      throw Error();
    },
    setItem() {
      throw Error();
    },
    removeItem() {
      throw Error();
    },
  };
  assert.equal(loadDraft(broken, "key"), null);
  assert.equal(saveDraft(broken, "key", "draft"), false);
  assert.equal(saveDraft(broken, "key", ""), false);
});

test("multi navigation URLs include subreddit names and encoded multi name", () => {
  assert.equal(
    constructMultiLink({
      data: {
        name: "News & Stuff",
        subreddits: [{ name: "news" }, { name: "worldnews" }],
      },
    }),
    "/r/news+worldnews?m=News%20%26%20Stuff",
  );
  assert.equal(constructMultiLink({}), "/r/?m=");
});
