import assert from "node:assert/strict";
import test from "node:test";
import {
  SEARCH_HISTORY_KEY,
  SEARCH_HISTORY_LIMIT,
  addSearchHistory,
  clearSearchHistory,
  readSearchHistory,
} from "../lib/search-history";

const storage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
};

test("recent searches are normalized, deduplicated, and bounded", () => {
  const store = storage();
  for (let index = 0; index < SEARCH_HISTORY_LIMIT + 2; index++)
    addSearchHistory(` query ${index} `, store);
  addSearchHistory("QUERY 5", store);
  const history = readSearchHistory(store);
  assert.equal(history[0], "QUERY 5");
  assert.equal(history.length, SEARCH_HISTORY_LIMIT);
  assert.equal(history.filter((item) => item.toLowerCase() === "query 5").length, 1);
});

test("invalid data is ignored and history can be cleared", () => {
  const store = storage();
  store.setItem(SEARCH_HISTORY_KEY, "not json");
  assert.deepEqual(readSearchHistory(store), []);
  addSearchHistory("typescript", store);
  clearSearchHistory(store);
  assert.deepEqual(readSearchHistory(store), []);
});
