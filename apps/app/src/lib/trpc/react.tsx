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

function getUrl() {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

export function TRPCReactProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useState(() => makeQueryClient())[0];
  const trpcClient = useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        httpBatchLink({
          url: `${getUrl()}/api/trpc`,
          transformer: superjson,
          methodOverride: "POST",
        }),
      ],
    }),
  )[0];

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {children}
      </TRPCProvider>
    </QueryClientProvider>
  );
}
