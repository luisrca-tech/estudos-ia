import type { Metadata } from "next";

import { ModuleScreen } from "@/components/screens/module-screen";
import { db } from "@/services";

type ModulePageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: ModulePageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const found = await db.query.studyModule.findFirst({ where: { slug }, columns: { title: true } });
    return { title: found?.title ?? "Módulo" };
  } catch {
    // The page itself shows the database error.
    return { title: "Módulo" };
  }
}

export default async function ModulePage({ params }: ModulePageProps) {
  const { slug } = await params;
  return <ModuleScreen slug={slug} />;
}
