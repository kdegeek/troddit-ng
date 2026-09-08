export const LOCAL_BOOKMARKS_KEY = "troddit:local-bookmarks";
export const LOCAL_BOOKMARKS_EVENT = "troddit:local-bookmarks-changed";

export interface LocalBookmark {
  id: string;
  title: string;
  permalink: string;
  subreddit: string;
  author: string;
}

export type BookmarkStorage = Pick<Storage, "getItem" | "setItem">;

function isBookmark(value: unknown): value is LocalBookmark {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    item.id.startsWith("t3_") &&
    typeof item.title === "string" &&
    !!item.title.trim() &&
    typeof item.permalink === "string" &&
    /^\/(r|user)\/[^/]+\/comments\//.test(item.permalink) &&
    !item.permalink.includes("\\") &&
    typeof item.subreddit === "string" &&
    typeof item.author === "string"
  );
}

export function readLocalBookmarks(storage?: BookmarkStorage): LocalBookmark[] {
  if (!storage) return [];
  try {
    const value = JSON.parse(storage.getItem(LOCAL_BOOKMARKS_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter(isBookmark) : [];
  } catch {
    return [];
  }
}

function write(bookmarks: LocalBookmark[], storage?: BookmarkStorage) {
  if (!storage) return false;
  try {
    storage.setItem(LOCAL_BOOKMARKS_KEY, JSON.stringify(bookmarks));
    return true;
  } catch {
    return false;
  }
}

export function addLocalBookmark(
  item: LocalBookmark,
  storage?: BookmarkStorage,
) {
  if (!isBookmark(item)) return readLocalBookmarks(storage);
  const next = [
    item,
    ...readLocalBookmarks(storage).filter(({ id }) => id !== item.id),
  ];
  return write(next, storage) ? next : readLocalBookmarks(storage);
}

export function removeLocalBookmark(id: string, storage?: BookmarkStorage) {
  const next = readLocalBookmarks(storage).filter((item) => item.id !== id);
  return write(next, storage) ? next : readLocalBookmarks(storage);
}

export function hasLocalBookmark(id: string, storage?: BookmarkStorage) {
  return readLocalBookmarks(storage).some((item) => item.id === id);
}
