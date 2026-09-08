import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  addLocalBookmark,
  hasLocalBookmark,
  LOCAL_BOOKMARKS_EVENT,
  LOCAL_BOOKMARKS_KEY,
  LocalBookmark,
  readLocalBookmarks,
  removeLocalBookmark,
} from "../../lib/bookmarks";

function storage() {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export default function useLocalBookmarks() {
  const [bookmarks, setBookmarks] = useState<LocalBookmark[]>([]);

  const refresh = useCallback(
    () => setBookmarks(readLocalBookmarks(storage())),
    [],
  );
  useEffect(() => {
    refresh();
    const onStorage = (event: StorageEvent) => {
      if (event.key === LOCAL_BOOKMARKS_KEY || event.key === null) refresh();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(LOCAL_BOOKMARKS_EVENT, refresh);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(LOCAL_BOOKMARKS_EVENT, refresh);
    };
  }, [refresh]);

  const announce = () => window.dispatchEvent(new Event(LOCAL_BOOKMARKS_EVENT));
  const add = (item: LocalBookmark) => {
    const result = addLocalBookmark(item, storage());
    if (!result.some(({ id }) => id === item.id))
      toast.error(
        "Could not save this bookmark. Check browser storage permissions or available space.",
      );
    announce();
  };
  const remove = (id: string) => {
    const result = removeLocalBookmark(id, storage());
    if (result.some((item) => item.id === id))
      toast.error(
        "Could not remove this bookmark. Check browser storage permissions.",
      );
    announce();
  };

  return {
    bookmarks,
    add,
    remove,
    has: (id: string) => hasLocalBookmark(id, storage()),
  };
}
