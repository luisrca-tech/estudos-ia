import type { Metadata } from "next";

import { ModulesScreen } from "@/components/screens/modules-screen";

export const metadata: Metadata = { title: "Módulos" };

export default function ModulesPage() {
  return <ModulesScreen />;
}
