import test from "node:test";
import assert from "node:assert/strict";
import {
  ACCENTS,
  DEFAULT_APPEARANCE,
  isDarkPalette,
  PALETTES,
  validateAppearance,
} from "../lib/appearance";
import { validatePreferenceBackup } from "../lib/preferences";

function luminance(hex: string) {
  const rgb = hex
    .slice(1)
    .match(/../g)!
    .map((v) => parseInt(v, 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
test("all palettes and accent choices meet AA text contrast on reading surfaces", () => {
  for (const [key, palette] of Object.entries(PALETTES)) {
    assert.equal(isDarkPalette(key), palette.dark);
    for (const bg of [palette.background, palette.surface]) {
      for (const fg of [
        palette.text,
        palette.muted,
        palette.accent,
        ...Object.values(ACCENTS)
          .map((a) => a[palette.dark ? "dark" : "light"])
          .filter(Boolean),
      ]) {
        const a = luminance(bg),
          b = luminance(fg);
        assert.ok(
          (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 4.5,
          `${key}: ${fg} on ${bg}`,
        );
      }
    }
  }
});
test("reading tuning validates boundaries and rejects unsafe values", () => {
  assert.deepEqual(validateAppearance(DEFAULT_APPEARANCE), DEFAULT_APPEARANCE);
  for (const patch of [
    { textSize: 21 },
    { textSize: 13 },
    { lineHeight: NaN },
    { font: "url(x)" },
    { accent: "constructor" },
    { density: "unknown" },
  ]) {
    assert.throws(() =>
      validateAppearance({ ...DEFAULT_APPEARANCE, ...patch }),
    );
  }
  assert.equal(
    validateAppearance({
      ...DEFAULT_APPEARANCE,
      textSize: 20,
      lineHeight: 1.95,
    }).textSize,
    20,
  );
});
test("new themes and tuning round-trip through backups; old backups remain valid", () => {
  const base = {
    kind: "troddit-preferences",
    version: 1,
    preferences: {},
    collections: {},
  };
  assert.equal(validatePreferenceBackup(base).appearance, undefined);
  for (const theme of Object.keys(PALETTES)) {
    const backup = validatePreferenceBackup({
      ...base,
      theme,
      appearance: DEFAULT_APPEARANCE,
    });
    assert.equal(backup.theme, theme);
    assert.deepEqual(backup.appearance, DEFAULT_APPEARANCE);
  }
});
