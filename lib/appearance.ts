// One catalog for the picker, theme tokens, light/dark switching, and backups.
export const PALETTES = {
  light: {
    name: "Meadow",
    dark: false,
    background: "#f6f7f4",
    surface: "#ffffff",
    text: "#26352f",
    muted: "#5e7065",
    accent: "#287453",
    border: "#dbe4d9",
    tint: "#eaf1e7",
  },
  linen: {
    name: "Linen",
    dark: false,
    background: "#f5f0e7",
    surface: "#fffcf5",
    text: "#40372d",
    muted: "#756653",
    accent: "#916034",
    border: "#ded3c1",
    tint: "#eee3d1",
  },
  rose: {
    name: "Rosewater",
    dark: false,
    background: "#fbf2f4",
    surface: "#fffafb",
    text: "#48323e",
    muted: "#806273",
    accent: "#a33e68",
    border: "#ead5de",
    tint: "#f4e3ea",
  },
  arctic: {
    name: "Arctic",
    dark: false,
    background: "#eef4f9",
    surface: "#fafcfe",
    text: "#263a50",
    muted: "#536b82",
    accent: "#266c9d",
    border: "#cfdfec",
    tint: "#e0edf6",
  },
  lavender: {
    name: "Lavender",
    dark: false,
    background: "#f4f1fa",
    surface: "#fdfbff",
    text: "#3e3451",
    muted: "#726483",
    accent: "#7650a7",
    border: "#dfd6ed",
    tint: "#ece4f5",
  },
  dark: {
    name: "Forest",
    dark: true,
    background: "#141b18",
    surface: "#1d2721",
    text: "#dce6dd",
    muted: "#a3b6a8",
    accent: "#8ec6a1",
    border: "#35483b",
    tint: "#293d2e",
  },
  espresso: {
    name: "Espresso",
    dark: true,
    background: "#211b18",
    surface: "#2d2520",
    text: "#eee0cf",
    muted: "#bda995",
    accent: "#dfb47e",
    border: "#504135",
    tint: "#413226",
  },
  abyss: {
    name: "Abyss",
    dark: true,
    background: "#101723",
    surface: "#192435",
    text: "#dfebf5",
    muted: "#a0b4cb",
    accent: "#85b7ee",
    border: "#344963",
    tint: "#243951",
  },
  black: {
    name: "OLED",
    dark: true,
    background: "#000000",
    surface: "#0c0c0c",
    text: "#f5f5f5",
    muted: "#b6b6b6",
    accent: "#b1e0c0",
    border: "#383838",
    tint: "#1c2520",
  },
  dracula: {
    name: "Dracula",
    dark: true,
    background: "#20212c",
    surface: "#292b3a",
    text: "#f8f8f2",
    muted: "#b2b3cb",
    accent: "#d0a5ff",
    border: "#494b68",
    tint: "#3c3153",
  },
  nord: {
    name: "Nord",
    dark: true,
    background: "#2e3440",
    surface: "#363f50",
    text: "#eceff4",
    muted: "#b4c2d6",
    accent: "#8fced6",
    border: "#53617a",
    tint: "#3d5263",
  },
  ocean: {
    name: "Ocean",
    dark: true,
    background: "#10262c",
    surface: "#19333b",
    text: "#dcf0ee",
    muted: "#a0c4c5",
    accent: "#83d7c6",
    border: "#355861",
    tint: "#244b50",
  },
  palenight: {
    name: "Palenight",
    dark: true,
    background: "#252637",
    surface: "#303148",
    text: "#eeebfa",
    muted: "#b7b3d0",
    accent: "#c6adf4",
    border: "#4d4c6b",
    tint: "#413954",
  },
} as const;
export const ACCENTS = {
  theme: { name: "Palette", light: "", dark: "" },
  fern: { name: "Fern", light: "#287453", dark: "#98d5ad" },
  blue: { name: "Blue", light: "#286bba", dark: "#97c2ff" },
  plum: { name: "Plum", light: "#8052a5", dark: "#d4b0fa" },
  coral: { name: "Coral", light: "#a8413b", dark: "#ffafa3" },
} as const;
export type Appearance = {
  textSize: number;
  lineHeight: number;
  font: "sans" | "serif";
  density: "comfortable" | "compact";
  accent: keyof typeof ACCENTS;
};
export const DEFAULT_APPEARANCE: Appearance = {
  textSize: 16,
  lineHeight: 1.7,
  font: "sans",
  density: "comfortable",
  accent: "theme",
};
export const APPEARANCE_KEY = "troddit:appearance";
export function validateAppearance(value: unknown): Appearance {
  const v = value as Appearance;
  if (
    !v ||
    !Number.isInteger(v.textSize) ||
    v.textSize < 14 ||
    v.textSize > 20 ||
    !Number.isFinite(v.lineHeight) ||
    v.lineHeight < 1.45 ||
    v.lineHeight > 1.95 ||
    !["sans", "serif"].includes(v.font) ||
    !["comfortable", "compact"].includes(v.density) ||
    !Object.hasOwn(ACCENTS, v.accent)
  )
    throw new Error("Invalid reading appearance settings.");
  return {
    textSize: v.textSize,
    lineHeight: v.lineHeight,
    font: v.font,
    density: v.density,
    accent: v.accent,
  };
}
export function isDarkPalette(theme?: string) {
  return Boolean(PALETTES[theme as keyof typeof PALETTES]?.dark);
}
export function paletteTokens(p: (typeof PALETTES)[keyof typeof PALETTES]) {
  return {
    background: p.background,
    background2: p.surface,
    post: p.surface,
    post2: p.surface,
    postHover: p.tint,
    base: p.tint,
    highlight: p.tint,
    text: p.text,
    textBody: p.text,
    textHeading: p.text,
    textStrong: p.accent,
    textLight: p.muted,
    "troddit-accent": p.accent,
    border: p.border,
    border2: p.border,
    borderHighlight: p.accent,
    borderHighlight2: p.accent,
    link: p.accent,
    linkHover: p.text,
    scrollbar: p.border,
    commentRibbon: p.border,
    commentRibbonHover: p.accent,
    backgroundComment: p.surface,
    backgroundCommentAlternate: p.background,
    toggleColor: p.border,
    toggleHandleColor: p.accent,
    "surface-tint": p.tint,
    red: p.dark ? "#f5a7a0" : "#a53434",
    green: p.accent,
    upvote: p.dark ? "#f3b181" : "#aa4d21",
    downvote: p.dark ? "#a9c7ff" : "#365fa4",
  };
}
