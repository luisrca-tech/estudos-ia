import type { AppRouter } from "@estudos-ia/api/routers/index";
import { environmentManager, QueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink, TRPCClientError } from "@trpc/client";
import type { inferRouterOutputs } from "@trpc/server";
import { createTRPCContext } from "@trpc/tanstack-react-query";

export const { TRPCProvider, useTRPC, useTRPCClient } = createTRPCContext<AppRouter>();

export type RouterOutputs = inferRouterOutputs<AppRouter>;

/** tRPC error code such as NOT_FOUND or CONFLICT, when the error came from the API. */
export function errorCode(error: unknown): string | undefined {
  return error instanceof TRPCClientError ? (error.data as { code?: string } | undefined)?.code : undefined;
}

function isClientError(error: unknown): boolean {
  const status =
    error instanceof TRPCClientError ? (error.data as { httpStatus?: number } | undefined)?.httpStatus : undefined;
  return status !== undefined && status < 500;
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5_000,
        // A 4xx will not get better by asking again.
        retry: (failureCount, error) => failureCount < 1 && !isClientError(error),
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (environmentManager.isServer()) {
    return makeQueryClient();
  }

  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}

export function makeTRPCClient() {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: "/api/trpc",
      }),
    ],
  });
}
