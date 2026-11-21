/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { UthanaClient, UthanaClientOptions } from "@uthana/client";
import type { ReactNode } from "react";
import { createContext, useContext, useMemo } from "react";
import {
  createUthanaClient,
  getUthanaClient,
  getUthanaClientOptionsKey,
  getUthanaClientScope,
} from "./client";

const delegatedCacheOwners = new WeakMap<
  QueryClient,
  { clientKey: string; scope: string | undefined }
>();

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
  const delegatedOwner = providedQueryClient
    ? delegatedCacheOwners.get(providedQueryClient)
    : undefined;
  const isDelegated = options?.accessToken !== undefined;
  if (isDelegated || delegatedOwner !== undefined) {
    if (isDelegated && !queryScope?.trim()) {
      throw new Error(
        "Set queryScope to a public user and organization namespace for delegated React access.",
      );
    }
    if (providedQueryClient) {
      const owner = delegatedOwner;
      const hasCachedQueries = providedQueryClient.getQueryCache().getAll().length > 0;
      const hasCachedMutations = providedQueryClient.getMutationCache().getAll().length > 0;
      if (
        (owner?.clientKey !== clientKey || owner.scope !== queryScope) &&
        (hasCachedQueries || hasCachedMutations)
      ) {
        throw new Error(
          "Use a new or cleared QueryClient when delegated credentials change; never reuse another account's cache.",
        );
      }
    }
  }
  const client = useMemo(() => createUthanaClient(apiKey, options), [apiKey, optionsKey]);
  const queryClient = useMemo(() => new QueryClient(), [client, queryScope]);
  if (providedQueryClient) {
    if (isDelegated) {
      delegatedCacheOwners.set(providedQueryClient, { clientKey, scope: queryScope });
    } else if (delegatedOwner !== undefined) {
      delegatedCacheOwners.delete(providedQueryClient);
    }
  }
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
