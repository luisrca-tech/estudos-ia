import type { Metadata } from "next";

import { ImportScreen } from "@/components/screens/import-screen";

export const metadata: Metadata = { title: "Importar" };

export default function ImportPage() {
  return <ImportScreen />;
}
