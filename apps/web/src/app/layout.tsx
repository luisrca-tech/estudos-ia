import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Literata } from "next/font/google";

import "../index.css";
import { CommandPalette } from "@/components/command-palette";
import Header from "@/components/header";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";
import Providers from "@/components/providers";
import { SessionDock } from "@/components/session-dock";

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
        <Providers>
          <div className="flex min-h-svh flex-col">
            <Header />
            <div className="flex flex-1 flex-col">{children}</div>
            <SessionDock />
          </div>
          <CommandPalette />
          <KeyboardShortcuts />
        </Providers>
      </body>
    </html>
  );
}
