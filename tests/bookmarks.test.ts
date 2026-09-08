import assert from "node:assert/strict";
import test from "node:test";
import {
  addLocalBookmark,
  hasLocalBookmark,
  LOCAL_BOOKMARKS_KEY,
  readLocalBookmarks,
  removeLocalBookmark,
} from "../lib/bookmarks";

const storage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
};

const first = {
  id: "t3_abc",
  title: "A useful post",
  permalink: "/r/test/comments/abc/a_useful_post/",
  subreddit: "test",
  author: "someone",
};

test("local bookmarks add, deduplicate, and remove posts", () => {
  const store = storage();
  addLocalBookmark(first, store);
  addLocalBookmark({ ...first, title: "Updated title" }, store);
  assert.equal(readLocalBookmarks(store).length, 1);
  assert.equal(readLocalBookmarks(store)[0].title, "Updated title");
  assert.equal(hasLocalBookmark(first.id, store), true);
  removeLocalBookmark(first.id, store);
  assert.deepEqual(readLocalBookmarks(store), []);
});

test("invalid, corrupt, and non-post records are ignored", () => {
  const store = storage();
  store.setItem(LOCAL_BOOKMARKS_KEY, "broken json");
  assert.deepEqual(readLocalBookmarks(store), []);
  store.setItem(LOCAL_BOOKMARKS_KEY, JSON.stringify([{ ...first, id: "t1_comment" }, first, { token: "secret" }]));
  assert.deepEqual(readLocalBookmarks(store), [first]);
});

test("storage failures do not report a successful bookmark", () => {
  const failing = {
    getItem: () => null,
    setItem: () => { throw new Error("quota exceeded"); },
  };
  assert.deepEqual(addLocalBookmark(first, failing), []);
  assert.equal(hasLocalBookmark(first.id, failing), false);
});
