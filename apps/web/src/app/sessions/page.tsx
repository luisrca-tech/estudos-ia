import type { Metadata } from "next";

import { SessionsScreen } from "@/components/screens/sessions-screen";

export const metadata: Metadata = { title: "Sessões" };

export default function SessionsPage() {
  return <SessionsScreen />;
}
