import type { Metadata } from "next";

import { ReviewsScreen } from "@/components/screens/reviews-screen";

export const metadata: Metadata = { title: "Revisões" };

export default function ReviewsPage() {
  return <ReviewsScreen />;
}
