import type { Metadata } from "next";

import { EditNoteScreen } from "@/components/screens/note-screens";

export const metadata: Metadata = { title: "Editar nota" };

export default async function NotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditNoteScreen id={id} />;
}
