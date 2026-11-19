"use client";

import { useQueryClient } from "@tanstack/react-query";

/**
 * Every screen derives from the same few tables (alerts, queue, counts), so a
 * write refreshes everything instead of tracking which queries it touched.
 */
export function useRefreshAll() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries();
}
