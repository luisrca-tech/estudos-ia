import { ImageResponse } from "next/og";

import { BRAND_COLORS } from "@/lib/brand";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home screen icon: the three steps on the accent color (iOS rounds the corners itself). */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: BRAND_COLORS.light.accent }}>
        <svg width="180" height="180" viewBox="0 0 32 32">
          <path fill="#FFFFFF" d="M6 26V20H12V14H18V8H26V26Z" />
        </svg>
      </div>
    ),
    size,
  );
}
