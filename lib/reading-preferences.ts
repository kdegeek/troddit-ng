export type ViewMode = "reader" | "compact" | "gallery";
export type ReadingLayout = "auto" | "stacked" | "split";

export function getViewMode(preferences: {
  cardStyle?: string;
  mediaOnly?: boolean;
}): ViewMode {
  if (preferences.mediaOnly) return "gallery";
  return preferences.cardStyle === "row1" || preferences.cardStyle === "card2"
    ? "compact"
    : "reader";
}

// These presets intentionally use the existing persisted keys. Existing users
// keep their exact settings until they choose a preset; no destructive migration.
export function viewPreset(view: ViewMode) {
  return {
    cardStyle: view === "compact" ? "row1" : "card1",
    mediaOnly: view === "gallery",
    columnOverride: view === "gallery" ? 0 : 1,
  };
}

export function layoutPreset(layout: ReadingLayout) {
  return {
    postWideUI: layout !== "stacked",
    preferSideBySide: layout === "split",
    disableSideBySide: layout === "stacked",
  };
}
