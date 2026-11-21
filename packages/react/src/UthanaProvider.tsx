/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { UthanaClient, UthanaClientOptions } from "@uthana/client";
import type { ReactNode } from "react";
import { createContext, useContext, useInsertionEffect, useMemo } from "react";
import {
  createUthanaClient,
  getUthanaClient,
  getUthanaClientOptionsKey,
  getUthanaClientScope,
} from "./client";

type CacheOwner =
  | { kind: "api-key" }
  | { kind: "delegated"; clientKey: string; scope: string | undefined };

const externalCacheOwners = new WeakMap<QueryClient, CacheOwner>();
const CACHE_OWNER_ERROR =
  "Use a new QueryClient when delegated credentials, request options or organization change; clearing a cache does not change its owner.";

function hasDifferentOwner(owner: CacheOwner | undefined, next: CacheOwner): boolean {
  if (owner === undefined || (owner.kind === "api-key" && next.kind === "api-key")) {
    return false;
  }
  return (
    owner.kind !== "delegated" ||
    next.kind !== "delegated" ||
    owner.clientKey !== next.clientKey ||
    owner.scope !== next.scope
  );
}

const QueryScopeContext = createContext<string | null>(null);

const UthanaContext = createContext<UthanaClient | null>(null);

/**
 * Returns the Uthana client from context (UthanaProvider) or the singleton (createUthanaClient).
 */
export function useUthanaClient(): UthanaClient {
  const fromContext = useContext(UthanaContext);
  if (fromContext) return fromContext;
  return getUthanaClient();
}

/** Stable public account/organization namespace for hydrated query keys. */
export function useUthanaQueryScope(client: UthanaClient): string {
  const scope = useContext(QueryScopeContext);
  if (scope !== null) {
    return JSON.stringify([client.baseUrl, scope]);
  }
  if (!("window" in globalThis)) {
    throw new Error(
      "Set UthanaProvider queryScope to the same public account/organization ID on the server and browser before using scoped queries.",
    );
  }
  return getUthanaClientScope(client);
}

export interface UthanaProviderProps {
  apiKey: string;
  options?: UthanaClientOptions;
  /** Public account/organization namespace. Required for SSR of scoped queries; never a credential. */
  queryScope?: string;
  /** When provided, UthanaProvider will not render QueryClientProvider. Use your own above. */
  queryClient?: QueryClient;
  children: ReactNode;
}

/**
 * Provider that supplies the Uthana client and optionally react-query.
 * When queryClient is passed, only the client context is provided (use your own QueryClientProvider).
 * When not passed, creates a QueryClient and wraps with QueryClientProvider.
 */
export function UthanaProvider({
  apiKey,
  options,
  queryScope,
  queryClient: providedQueryClient,
  children,
}: UthanaProviderProps) {
  const optionsKey = getUthanaClientOptionsKey(options);
  const clientKey = JSON.stringify([apiKey, optionsKey]);
  if (queryScope !== undefined && !queryScope.trim()) {
    throw new Error("queryScope must be a nonempty public account/organization namespace.");
  }
  const cacheOwner = providedQueryClient ? externalCacheOwners.get(providedQueryClient) : undefined;
  const isDelegated = options?.accessToken !== undefined;
  const nextOwner: CacheOwner = isDelegated
    ? { kind: "delegated", clientKey, scope: queryScope }
    : { kind: "api-key" };
  if (isDelegated || cacheOwner?.kind === "delegated") {
    if (isDelegated && !queryScope?.trim()) {
      throw new Error(
        "Set queryScope to a public user and organization namespace for delegated React access.",
      );
    }
    if (providedQueryClient) {
      const hasUnclaimedData =
        cacheOwner === undefined &&
        (providedQueryClient.getQueryCache().getAll().length > 0 ||
          providedQueryClient.getMutationCache().getAll().length > 0);
      if (hasDifferentOwner(cacheOwner, nextOwner) || hasUnclaimedData) {
        throw new Error(CACHE_OWNER_ERROR);
      }
    }
  }
  const client = useMemo(() => createUthanaClient(apiKey, options), [apiKey, optionsKey]);
  const queryClient = useMemo(() => new QueryClient(), [client, queryScope]);
  // Claim only committed renders, before descendant query subscriptions run.
  useInsertionEffect(() => {
    if (providedQueryClient) {
      if (hasDifferentOwner(externalCacheOwners.get(providedQueryClient), nextOwner)) {
        throw new Error(CACHE_OWNER_ERROR);
      }
      externalCacheOwners.set(providedQueryClient, nextOwner);
    }
  });
  const content = providedQueryClient ? (
    children
  ) : (
    <QueryClientProvider
      key={JSON.stringify([getUthanaClientScope(client), queryScope])}
      client={queryClient}
    >
      {children}
    </QueryClientProvider>
  );
  return (
    <UthanaContext.Provider value={client}>
      <QueryScopeContext.Provider value={queryScope ?? null}>{content}</QueryScopeContext.Provider>
    </UthanaContext.Provider>
  );
}
