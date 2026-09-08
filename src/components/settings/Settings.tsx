import { Tab } from "@headlessui/react";
import React, { ChangeEvent, useRef, useState } from "react";
import { useMainContext } from "../../MainContext";
import { exportPreferences, importPreferences } from "../../../lib/preferences";
import DefaultSortSelector from "./DefaultSortSelector";
import FilterEntities from "./FilterEntities";
import History from "./History";
import IntInput from "./IntInput";
import AppearanceControls from "./AppearanceControls";
import Toggles from "./Toggles";
import ToggleFilters from "../ToggleFilters";
import useReadingPreferences from "../../hooks/useReadingPreferences";
import ColumnCardOptions from "./ColumnCardOptions";

const toggleRow = (setting: any) => (
  <Toggles
    key={setting}
    setting={setting}
    withSubtext
    externalStyles="rounded-lg group hover:bg-th-highlight p-2 cursor-pointer"
  />
);

const Choice = ({
  active,
  title,
  detail,
  onClick,
}: {
  active: boolean;
  title: string;
  detail: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    className="settings-choice"
    data-active={active}
    aria-pressed={active}
    onClick={onClick}
  >
    <strong>{title}</strong>
    <span>{detail}</span>
  </button>
);

const Settings = () => {
  const context: any = useMainContext();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("");
  const {
    view: activeView,
    layout,
    setView,
    setLayout,
  } = useReadingPreferences();

  const download = async () => {
    try {
      const data = await exportPreferences();
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `troddit-preferences-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setStatus("Backup downloaded.");
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Could not export preferences.",
      );
    }
  };
  const restore = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 5 * 1024 * 1024)
        throw new Error("Choose a preferences backup smaller than 5 MB.");
      await importPreferences(JSON.parse(await file.text()));
      setStatus("Backup imported. Reloading to apply your preferences…");
      window.setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Could not import that file.",
      );
      event.target.value = "";
    }
  };

  const groups = [
    {
      name: "Appearance",
      content: (
        <>
          <AppearanceControls />
          <h3 className="mb-2 text-sm font-semibold">View preset</h3>
          <div className="settings-choice-grid">
            <Choice
              active={activeView === "reader"}
              title="Reader"
              detail="Comfortable cards with room to read"
              onClick={() => setView("reader")}
            />
            <Choice
              active={activeView === "compact"}
              title="Compact"
              detail="Efficient rows for quick scanning"
              onClick={() => setView("compact")}
            />
            <Choice
              active={activeView === "gallery"}
              title="Gallery"
              detail="Media-first responsive grid"
              onClick={() => setView("gallery")}
            />
          </div>
          <div className="settings-stack">
            {["compactLinkPics", "dimRead", "showAwardings", "showFlairs"].map(
              toggleRow,
            )}
          </div>
        </>
      ),
    },
    {
      name: "Layout",
      content: (
        <>
          <p className="mb-4 text-sm text-th-textLight">
            Choose how an open post and its comments share the screen. Small
            screens always use a focused, stacked view.
          </p>
          <div className="settings-choice-grid">
            <Choice
              active={layout === "auto"}
              title="Auto"
              detail="Adapt to the post and screen"
              onClick={() => setLayout("auto")}
            />
            <Choice
              active={layout === "stacked"}
              title="Stacked"
              detail="Comments below the post"
              onClick={() => setLayout("stacked")}
            />
            <Choice
              active={layout === "split"}
              title="Split"
              detail="Media and comments side by side"
              onClick={() => setLayout("split")}
            />
          </div>
          <details>
            <summary className="py-3 cursor-pointer">
              Advanced layout options
            </summary>
            <div className="flex items-center justify-between p-2">
              <span>Feed columns</span>
              <div className="w-28">
                <ColumnCardOptions mode="columns" />
              </div>
            </div>
            <div className="settings-stack">
              {[
                "uniformHeights",
                "wideUI",
                "postWideUI",
                "preferSideBySide",
                "disableSideBySide",
              ].map(toggleRow)}
            </div>
          </details>
        </>
      ),
    },
    {
      name: "Media",
      content: (
        <div className="settings-stack">
          {[
            "disableEmbeds",
            "preferEmbeds",
            "embedsEverywhere",
            "expandImages",
            "autoplay",
            "hoverplay",
            "audioOnHover",
            "nsfw",
          ].map(toggleRow)}
        </div>
      ),
    },
    {
      name: "Comments",
      content: (
        <div className="settings-stack">
          {[
            "showUserIcons",
            "showUserFlairs",
            "autoCollapseComments",
            "ribbonCollapseOnly",
            "collapseChildrenOnly",
            "defaultCollapseChildren",
          ].map(toggleRow)}
          <div className="flex items-center justify-between p-2">
            <span>Default comment sorting</span>
            <div className="min-w-[7rem]">
              <DefaultSortSelector mode="comments" />
            </div>
          </div>
        </div>
      ),
    },
    {
      name: "Filters",
      content: (
        <div className="settings-stack">
          {[
            "self",
            "links",
            "images",
            "videos",
            "portrait",
            "landscape",
            "read",
            "seen",
          ].map((filter) => (
            <ToggleFilters
              key={filter}
              filter={filter}
              withSubtext
              quickToggle
            />
          ))}
          <FilterEntities />
        </div>
      ),
    },
    {
      name: "Behavior",
      content: (
        <div className="settings-stack">
          {["autoRead", "autoSeen", "infiniteLoading", "autoRefreshFeed"].map(
            toggleRow,
          )}
          <IntInput setting="slowRefreshInterval" />
          <IntInput setting="fastRefreshInterval" />
          {["refreshOnFocus", "askToUpdateFeed", "autoRefreshComments"].map(
            toggleRow,
          )}
        </div>
      ),
    },
    { name: "History", content: <History /> },
    {
      name: "Data",
      content: (
        <>
          <p className="text-sm opacity-70">
            Download or restore preferences, local subscriptions, favorites, and
            local collections. Accounts, tokens, browsing history, and caches
            are never included.
          </p>
          <div className="settings-data-actions">
            <button
              className="settings-action"
              type="button"
              onClick={download}
            >
              Export backup
            </button>
            <button
              className="settings-action"
              type="button"
              onClick={() => inputRef.current?.click()}
            >
              Import backup
            </button>
          </div>
          <input
            ref={inputRef}
            className="hidden"
            type="file"
            accept="application/json,.json"
            onChange={restore}
          />
          {status && (
            <p className="settings-status" role="status" aria-live="polite">
              {status}
            </p>
          )}
        </>
      ),
    },
  ];

  return (
    <Tab.Group as="div" className="settings-tabs">
      <Tab.List className="settings-tablist" aria-label="Settings sections">
        {groups.map(({ name }) => (
          <Tab key={name} className="settings-tab">
            {name}
          </Tab>
        ))}
      </Tab.List>
      <Tab.Panels>
        {groups.map(({ name, content }) => (
          <Tab.Panel key={name} className="settings-panel">
            <h2 className="settings-panel-title">{name}</h2>
            {content}
          </Tab.Panel>
        ))}
      </Tab.Panels>
    </Tab.Group>
  );
};

export default Settings;
