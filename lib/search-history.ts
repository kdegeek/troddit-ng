export const SEARCH_HISTORY_KEY = "troddit:recent-searches";
export const SEARCH_HISTORY_LIMIT = 8;

type SearchStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function readSearchHistory(storage?: SearchStorage): string[] {
  if (!storage) return [];
  try {
    const parsed = JSON.parse(storage.getItem(SEARCH_HISTORY_KEY) ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

export function addSearchHistory(
  query: string,
  storage?: SearchStorage
): string[] {
  const normalized = query.trim();
  if (!normalized || !storage) return readSearchHistory(storage);
  const next = [
    normalized,
    ...readSearchHistory(storage).filter(
      (item) => item.toLocaleLowerCase() !== normalized.toLocaleLowerCase()
    ),
  ].slice(0, SEARCH_HISTORY_LIMIT);
  try {
    storage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next));
  } catch {}
  return next;
}

export function clearSearchHistory(storage?: SearchStorage): void {
  try {
    storage?.removeItem(SEARCH_HISTORY_KEY);
  } catch {}
}
