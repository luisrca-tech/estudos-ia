import { ImageResponse } from "next/og";

import { BRAND, BRAND_COLORS } from "@/lib/brand";

export const alt = `${BRAND.name}: ${BRAND.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const colors = BRAND_COLORS.light;

/**
 * Loads a Google font as TTF for the image. Rendering happens at build time;
 * if the font cannot be fetched, the image falls back to the built-in font.
 */
async function loadGoogleFont(family: string, weight: number, text: string): Promise<ArrayBuffer | null> {
  try {
    const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&text=${encodeURIComponent(text)}`;
    const css = await (await fetch(cssUrl, { signal: AbortSignal.timeout(5000) })).text();
    const fontUrl = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    if (!fontUrl) return null;
    const response = await fetch(fontUrl, { signal: AbortSignal.timeout(5000) });
    return response.ok ? await response.arrayBuffer() : null;
  } catch {
    return null;
  }
}

/** Steps rising to the right, the same mark as the icon. */
function Steps() {
  return (
    <svg width="380" height="380" viewBox="6 8 20 18">
      <path fill={colors.accent} d="M6 26V20H12V14H18V8H26V26Z" />
    </svg>
  );
}

export default async function OpenGraphImage() {
  const [serif, sans] = await Promise.all([
    loadGoogleFont("Literata", 600, BRAND.name),
    loadGoogleFont("IBM Plex Sans", 400, `${BRAND.tagline}degrau-ia.vercel.app`),
  ]);
  const fonts = [
    ...(serif ? [{ name: "Literata", data: serif, weight: 600 as const, style: "normal" as const }] : []),
    ...(sans ? [{ name: "IBM Plex Sans", data: sans, weight: 400 as const, style: "normal" as const }] : []),
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          padding: "88px 96px",
          background: colors.background,
          borderTop: `12px solid ${colors.accent}`,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 600, paddingBottom: 4 }}>
          <div style={{ fontFamily: serif ? "Literata" : undefined, fontSize: 128, fontWeight: 600, color: colors.foreground, lineHeight: 1 }}>
            {BRAND.name}
          </div>
          <div style={{ fontFamily: sans ? "IBM Plex Sans" : undefined, fontSize: 42, color: colors.muted, lineHeight: 1.3 }}>{BRAND.tagline}</div>
          <div style={{ fontFamily: sans ? "IBM Plex Sans" : undefined, fontSize: 26, color: colors.accent, marginTop: 24 }}>degrau-ia.vercel.app</div>
        </div>
        <Steps />
      </div>
    ),
    { ...size, fonts },
  );
}
