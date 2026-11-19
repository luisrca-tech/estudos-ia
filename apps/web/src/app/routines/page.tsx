import type { Metadata } from "next";

import { RoutinesScreen } from "@/components/screens/routines-screen";

export const metadata: Metadata = { title: "Rotinas" };

export default function RoutinesPage() {
  return <RoutinesScreen />;
}
