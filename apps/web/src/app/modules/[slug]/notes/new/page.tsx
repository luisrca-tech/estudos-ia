import type { Metadata } from "next";

import { NewNoteScreen } from "@/components/screens/note-screens";

export const metadata: Metadata = { title: "Nova nota" };

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ type?: string | string[]; sessionId?: string | string[] }>;
};

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function NewNotePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;
  return <NewNoteScreen slug={slug} type={first(query.type)} sessionId={first(query.sessionId)} />;
}
