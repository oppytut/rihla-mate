import "server-only";

import { headers } from "next/headers";
import { createElement, cache, type ReactNode } from "react";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { createCallerFactory } from "./init";
import { appRouter, type AppRouter } from "./routers/_app";
import { makeQueryClient } from "./query-client";
import { type TRPCContext } from "./context";
import { db } from "@/lib/db/client";

const createCaller = createCallerFactory(appRouter);

export const getQueryClient = cache(makeQueryClient);

async function createContext(): Promise<TRPCContext> {
  const heads = new Headers(await headers());
  return {
    headers: heads,
    db,
    session: null,
  };
}

export const trpc = createTRPCOptionsProxy<AppRouter>({
  router: appRouter,
  ctx: createContext,
  queryClient: getQueryClient,
});

export const caller = createCaller(createContext);

export function HydrateClient(props: { children: ReactNode }) {
  const queryClient = getQueryClient();
  return createElement(
    HydrationBoundary,
    { state: dehydrate(queryClient) },
    props.children
  );
}
