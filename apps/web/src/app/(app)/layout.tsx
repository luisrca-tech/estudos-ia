import { connection } from "next/server";

import { CommandPalette } from "@/components/command-palette";
import Header from "@/components/header";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";
import { SessionDock } from "@/components/session-dock";
import { getAuthConfig } from "@/lib/auth/config";

/** App chrome: header, session dock, command palette and shortcuts. */
export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // The lock is read per request, so "Sair" follows the runtime env.
  await connection();
  const { enabled: signOut } = getAuthConfig();

  return (
    <>
      <div className="flex min-h-svh flex-col">
        <Header signOut={signOut} />
        <div className="flex flex-1 flex-col">{children}</div>
        <SessionDock />
      </div>
      <CommandPalette signOut={signOut} />
      <KeyboardShortcuts />
    </>
  );
}
