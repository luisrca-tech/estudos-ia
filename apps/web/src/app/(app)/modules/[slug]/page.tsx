import { ModuleScreen } from "@/components/screens/module-screen";

export default async function ModulePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ModuleScreen slug={slug} />;
}
