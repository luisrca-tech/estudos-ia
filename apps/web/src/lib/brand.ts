/** Product name, tagline and the token colors used outside CSS (icons, OG image, manifest). */
export const BRAND = {
  name: "Degrau",
  tagline: "Um degrau por dia em Engenharia de IA",
  description: "Um degrau por dia em Engenharia de IA: sessões de estudo, notas com as próprias palavras, revisão espaçada e rotinas.",
} as const;

/** Mirrors docs/design/tokens.json (packages/ui globals.css stays the source of truth). */
export const BRAND_COLORS = {
  light: { background: "#F2F4F1", surface: "#FBFCFB", foreground: "#17212B", muted: "#57626C", accent: "#2A47C2", accentSoft: "#E3E8FA", line: "#D3D9D4" },
  dark: { background: "#11161B", surface: "#192027", accent: "#93A8FF" },
} as const;

export const DEFAULT_SITE_URL = "https://degrau-ia.vercel.app";
