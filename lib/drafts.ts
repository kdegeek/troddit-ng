type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function draftKey(
  user: string,
  mode: "REPLY" | "EDIT",
  parent: string,
  post: string,
) {
  return `troddit:draft:${[user, mode, parent, post].map(encodeURIComponent).join(":")}`;
}

export function loadDraft(storage: DraftStorage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

export function saveDraft(
  storage: DraftStorage,
  key: string,
  value: string,
): boolean {
  try {
    if (value) storage.setItem(key, value);
    else storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
