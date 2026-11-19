import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Literata } from "next/font/google";

import "../index.css";
import Providers from "@/components/providers";
import { ENV } from "@/env";
import { BRAND, BRAND_COLORS, DEFAULT_SITE_URL } from "@/lib/brand";

// Roles are documented in docs/design-system.md and docs/design/tokens.json.
const fontUi = IBM_Plex_Sans({ variable: "--font-ui", subsets: ["latin"], weight: ["400", "500", "600"] });
const fontReading = Literata({ variable: "--font-reading", subsets: ["latin"], style: ["normal", "italic"] });
const fontCode = IBM_Plex_Mono({ variable: "--font-code", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  metadataBase: new URL(ENV.SITE_URL || DEFAULT_SITE_URL),
  title: { default: BRAND.name, template: `%s · ${BRAND.name}` },
  description: BRAND.description,
  applicationName: BRAND.name,
  openGraph: { type: "website", locale: "pt_BR", siteName: BRAND.name, title: BRAND.name, description: BRAND.tagline },
  twitter: { card: "summary_large_image", title: BRAND.name, description: BRAND.tagline },
  // Personal app behind a login.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: BRAND_COLORS.light.surface },
    { media: "(prefers-color-scheme: dark)", color: BRAND_COLORS.dark.surface },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pt-BR"
      className={`${fontUi.variable} ${fontReading.variable} ${fontCode.variable}`}
      suppressHydrationWarning
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
