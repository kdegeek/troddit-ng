import React, { createContext, useContext, useEffect, useState } from "react";
import Head from "next/head";
import { useTheme } from "next-themes";
import {
  ACCENTS,
  APPEARANCE_KEY,
  Appearance,
  DEFAULT_APPEARANCE,
  isDarkPalette,
  paletteTokens,
  PALETTES,
  validateAppearance,
} from "../../lib/appearance";

const themeCSS = Object.entries(PALETTES)
  .map(
    ([key, palette]) =>
      `html[data-theme="${key}"]{color-scheme:${palette.dark ? "dark" : "light"};${Object.entries(
        paletteTokens(palette),
      )
        .map(([name, value]) => `--${name}:${value}`)
        .join(";")}}`,
  )
  .join("\n");
const AppearanceContext = createContext({
  appearance: DEFAULT_APPEARANCE,
  update: (_: Partial<Appearance>) => {},
  error: "",
});
export const useAppearance = () => useContext(AppearanceContext);
export default function AppearanceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { resolvedTheme } = useTheme();
  const [appearance, setAppearance] = useState(DEFAULT_APPEARANCE);
  const [error, setError] = useState("");
  useEffect(() => {
    const palette = PALETTES[resolvedTheme as keyof typeof PALETTES];
    if (palette)
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", palette.background);
  }, [resolvedTheme]);
  useEffect(() => {
    const read = () => {
      try {
        const value = localStorage.getItem(APPEARANCE_KEY);
        setAppearance(
          value ? validateAppearance(JSON.parse(value)) : DEFAULT_APPEARANCE,
        );
      } catch {
        setAppearance(DEFAULT_APPEARANCE);
      }
    };
    read();
    const onStorage = (event: StorageEvent) => {
      if (event.key === APPEARANCE_KEY || event.key === null) read();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  const update = (patch: Partial<Appearance>) => {
    const next = validateAppearance({ ...appearance, ...patch });
    setAppearance(next);
    try {
      localStorage.setItem(APPEARANCE_KEY, JSON.stringify(next));
      setError("");
    } catch {
      setError(
        "Applied for this visit. This browser could not save your reading settings.",
      );
    }
  };
  const accent =
    ACCENTS[appearance.accent][isDarkPalette(resolvedTheme) ? "dark" : "light"];
  const tuningCSS = `:root{--reader-size:${appearance.textSize}px;--reader-leading:${appearance.lineHeight};--reader-font:${appearance.font === "serif" ? 'Georgia, "Times New Roman", serif' : "var(--font-reading)"};--card-space:${appearance.density === "compact" ? 14 : 22}px}${accent ? `html[data-theme]{--troddit-accent:${accent};--link:${accent};--textStrong:${accent};--toggleHandleColor:${accent}}` : ""}`;
  return (
    <AppearanceContext.Provider value={{ appearance, update, error }}>
      <Head>
        <style key="palettes">{themeCSS}</style>
        <style key="reading-tuning">{tuningCSS}</style>
      </Head>
      {children}
    </AppearanceContext.Provider>
  );
}
