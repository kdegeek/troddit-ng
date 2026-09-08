import React from "react";
import { useTheme } from "next-themes";
import { ACCENTS, DEFAULT_APPEARANCE, PALETTES } from "../../../lib/appearance";
import { useAppearance } from "../AppearanceProvider";

export default function AppearanceControls() {
  const { theme, setTheme } = useTheme();
  const { appearance, update, error } = useAppearance();
  return (
    <div className="appearance-controls">
      <div className="appearance-section-heading">
        <div>
          <h3>Choose your atmosphere</h3>
          <p>Soft daylight, warm paper, or a quieter night.</p>
        </div>
        <button
          className="settings-action"
          aria-pressed={theme === "system"}
          onClick={() => setTheme("system")}
        >
          Use device theme
        </button>
      </div>
      {[false, true].map((dark) => (
        <fieldset key={String(dark)}>
          <legend>{dark ? "After dark" : "In the light"}</legend>
          <div className="palette-grid">
            {Object.entries(PALETTES)
              .filter(([, p]) => p.dark === dark)
              .map(([key, p]) => (
                <button
                  key={key}
                  className="palette-choice"
                  aria-pressed={theme === key}
                  aria-label={`${p.name} theme`}
                  onClick={() => setTheme(key)}
                >
                  <span
                    className="palette-scene"
                    style={{ background: p.background, borderColor: p.border }}
                  >
                    <span style={{ background: p.surface, color: p.text }}>
                      <i style={{ background: p.accent }} />
                      <b>Quietly curious.</b>
                      <span style={{ color: p.muted }}>
                        A space of your own
                      </span>
                    </span>
                  </span>
                  <span>
                    {p.name}
                    {theme === key && <span aria-hidden="true"> ✓</span>}
                  </span>
                </button>
              ))}
          </div>
        </fieldset>
      ))}
      <fieldset>
        <legend>Accent color</legend>
        <div className="accent-options">
          {Object.entries(ACCENTS).map(([key, value]) => (
            <button
              key={key}
              aria-pressed={appearance.accent === key}
              onClick={() => update({ accent: key as keyof typeof ACCENTS })}
            >
              <i
                style={{ background: value.light || "var(--troddit-accent)" }}
              />
              {value.name}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="appearance-section-heading">
        <div>
          <h3>Reading comfort</h3>
          <p>Adjust the reading text, not the size of every control.</p>
        </div>
        <button
          className="settings-action"
          onClick={() => update(DEFAULT_APPEARANCE)}
        >
          Reset tuning
        </button>
      </div>
      <div className="reading-tuners">
        <label>
          Text size <output>{appearance.textSize}px</output>
          <input
            aria-label="Reading text size"
            type="range"
            min="14"
            max="20"
            step="1"
            value={appearance.textSize}
            onChange={(e) => update({ textSize: Number(e.target.value) })}
          />
        </label>
        <label>
          Line spacing <output>{appearance.lineHeight.toFixed(2)}</output>
          <input
            aria-label="Reading line spacing"
            type="range"
            min="1.45"
            max="1.95"
            step="0.05"
            value={appearance.lineHeight}
            onChange={(e) => update({ lineHeight: Number(e.target.value) })}
          />
        </label>
        <label>
          Reading typeface
          <select
            value={appearance.font}
            onChange={(e) =>
              update({ font: e.target.value as "sans" | "serif" })
            }
          >
            <option value="sans">Modern sans</option>
            <option value="serif">Bookish serif</option>
          </select>
        </label>
        <label>
          Card spacing
          <select
            value={appearance.density}
            onChange={(e) =>
              update({ density: e.target.value as "comfortable" | "compact" })
            }
          >
            <option value="comfortable">Comfortable</option>
            <option value="compact">Compact</option>
          </select>
        </label>
      </div>
      <div className="reading-sample">
        <span className="eyebrow">LIVE PREVIEW</span>
        <h4>A little room to think.</h4>
        <p>
          The best conversations invite you to slow down. Find a comfortable
          rhythm, follow your curiosity, and make yourself at home.
        </p>
      </div>
      {error && <p role="status">{error}</p>}
    </div>
  );
}
