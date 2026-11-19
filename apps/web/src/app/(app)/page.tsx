import type { Metadata } from "next";

import { TodayScreen } from "@/components/screens/today-screen";

export const metadata: Metadata = { title: "Hoje" };

export default function TodayPage() {
  return <TodayScreen />;
}
