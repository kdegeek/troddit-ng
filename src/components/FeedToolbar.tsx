import React, { useEffect, useState } from "react";
import { FiBookOpen, FiGrid, FiList, FiRefreshCw } from "react-icons/fi";
import SortMenu from "./SortMenu";
import FilterMenu from "./FilterMenu";
import useReadingPreferences from "../hooks/useReadingPreferences";
import { ViewMode } from "../../lib/reading-preferences";
import { useMainContext } from "../MainContext";

const FILTERS = [
  ["seen", "seenFilter", "Seen posts"],
  ["read", "readFilter", "Read posts"],
  ["images", "imgFilter", "Images"],
  ["videos", "vidFilter", "Videos"],
  ["self", "selfFilter", "Text posts"],
  ["links", "linkFilter", "Links"],
  ["portrait", "imgPortraitFilter", "Portrait media"],
  ["landscape", "imgLandscapeFilter", "Landscape media"],
];

export default function FeedToolbar({
  title,
  description,
  refreshing,
  onRefresh,
}: {
  title: string;
  description: string;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const { view, setView } = useReadingPreferences();
  const context: any = useMainContext();
  const [pendingFilter, setPendingFilter] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    if (pendingFilter) {
      context.applyFilters();
      setPendingFilter(false);
    }
  }, [pendingFilter, context]);
  useEffect(() => {
    const scroll = () => setScrolled(window.scrollY > 700);
    scroll();
    window.addEventListener("scroll", scroll, { passive: true });
    return () => window.removeEventListener("scroll", scroll);
  }, []);
  const activeFilters = FILTERS.filter(([, key]) => context[key] === false);
  const modes: { value: ViewMode; label: string; icon: typeof FiGrid }[] = [
    { value: "reader", label: "Reader", icon: FiBookOpen },
    { value: "compact", label: "Compact", icon: FiList },
    { value: "gallery", label: "Gallery", icon: FiGrid },
  ];
  return (
    <>
      <div className="feed-heading">
        <div className="feed-title-row">
          <div>
            <p className="eyebrow">YOUR DAILY DISCOVERY</p>
            <h1>{title}</h1>
            <p className="feed-description">{description}</p>
          </div>
          <button
            className="icon-button feed-refresh"
            aria-label="Refresh feed"
            onClick={onRefresh}
            disabled={refreshing}
          >
            <FiRefreshCw className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </div>
      <div className="feed-controls">
        <div className="feed-toolbar">
          <div className="feed-sort">
            <SortMenu hide={false} />
            <FilterMenu hide={false} />
          </div>
          <div className="view-switcher" role="group" aria-label="Feed view">
            {modes.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                aria-pressed={view === value}
                onClick={() => setView(value)}
              >
                <Icon />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
        {context.filtersApplied > 0 && activeFilters.length > 0 && (
          <div className="active-filters" aria-label="Active content filters">
            {activeFilters.map(([filter, , label]) => (
              <button
                key={filter}
                aria-label={`Show ${label.toLowerCase()}`}
                onClick={() => {
                  context.toggleFilter(filter);
                  setPendingFilter(true);
                }}
              >
                Hidden: {label} <span aria-hidden="true">×</span>
              </button>
            ))}
            <button onClick={context.resetContentFilters}>
              Reset content filters
            </button>
          </div>
        )}
        {scrolled && !context.postOpen && (
          <button
            className="back-to-top"
            onClick={() =>
              window.scrollTo({
                top: 0,
                behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
                  .matches
                  ? "auto"
                  : "smooth",
              })
            }
          >
            ↑ Back to top
          </button>
        )}
      </div>
    </>
  );
}
