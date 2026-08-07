"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { createTRPCContext } from "@trpc/tanstack-react-query";
import { httpBatchLink, createTRPCClient } from "@trpc/client";
import superjson from "superjson";
import { type AppRouter } from "./routers/_app";
import { makeQueryClient } from "./query-client";
import { useState } from "react";

const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>();

export { TRPCProvider, useTRPC };

function getTrpcUrl() {
  return "/api/trpc";
}

let browserQueryClient: ReturnType<typeof makeQueryClient> | undefined;

function getQueryClient() {
  if (typeof window === "undefined") {
    return makeQueryClient();
  }
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}

export function TRPCReactProvider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        httpBatchLink({
          url: getTrpcUrl(),
          transformer: superjson,
          methodOverride: "POST",
          fetch(url, options) {
            return fetch(url, {
              ...options,
              credentials: "include",
            });
          },
        }),
      ],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {children}
      </TRPCProvider>
    </QueryClientProvider>
  );
}
