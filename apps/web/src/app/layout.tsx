import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Literata } from "next/font/google";

import "../index.css";
import Providers from "@/components/providers";

// Roles are documented in docs/design-system.md and docs/design/tokens.json.
const fontUi = IBM_Plex_Sans({ variable: "--font-ui", subsets: ["latin"], weight: ["400", "500", "600"] });
const fontReading = Literata({ variable: "--font-reading", subsets: ["latin"], style: ["normal", "italic"] });
const fontCode = IBM_Plex_Mono({ variable: "--font-code", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: { default: "estudos-ia", template: "%s · estudos-ia" },
  description: "Caderno diário da Trilha de Engenharia de Sistemas com IA.",
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
