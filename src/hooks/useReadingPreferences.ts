import { useMainContext } from "../MainContext";
import {
  getViewMode,
  layoutPreset,
  ReadingLayout,
  ViewMode,
  viewPreset,
} from "../../lib/reading-preferences";

// Owns user-facing display choices while retaining the legacy persistence and
// advanced controls. Feed and Settings must use the same preset semantics.
export default function useReadingPreferences() {
  const context: any = useMainContext();
  const setView = (view: ViewMode) => {
    const preset = viewPreset(view);
    context.setCardStyle(preset.cardStyle);
    context.setMediaOnly(preset.mediaOnly);
    context.setColumnOverride(preset.columnOverride);
    context.setFastRefresh((value: number) => value + 1);
  };
  const setLayout = (layout: ReadingLayout) => {
    const preset = layoutPreset(layout);
    context.setPostWideUI(preset.postWideUI);
    context.setPreferSideBySide(preset.preferSideBySide);
    context.setDisableSideBySide(preset.disableSideBySide);
  };
  return {
    view: getViewMode(context),
    setView,
    setLayout,
    layout: (context.disableSideBySide || !context.postWideUI
      ? "stacked"
      : context.preferSideBySide
        ? "split"
        : "auto") as ReadingLayout,
  };
}
