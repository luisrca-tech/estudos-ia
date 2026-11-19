import type { MetadataRoute } from "next";

import { BRAND, BRAND_COLORS } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND.name,
    short_name: BRAND.name,
    description: BRAND.description,
    lang: "pt-BR",
    start_url: "/",
    display: "standalone",
    background_color: BRAND_COLORS.light.background,
    theme_color: BRAND_COLORS.light.surface,
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      { src: "/apple-icon", type: "image/png", sizes: "180x180" },
    ],
  };
}
