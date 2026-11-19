"use client";

import { Toaster } from "@estudos-ia/ui/components/sonner";
import { QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

import { getQueryClient, makeTRPCClient, TRPCProvider } from "@/utils/trpc";

import { ThemeProvider } from "./theme-provider";

export default function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  const [trpcClient] = useState(makeTRPCClient);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
          {children}
        </TRPCProvider>
      </QueryClientProvider>
      <Toaster position="bottom-right" />
    </ThemeProvider>
  );
}
