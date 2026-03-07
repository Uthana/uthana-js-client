/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { UthanaClient, UthanaClientOptions } from "@uthana/client";
import type { ReactNode } from "react";
import { createContext, useContext, useMemo } from "react";
import { createUthanaClient, getUthanaClient } from "./client";

const UthanaContext = createContext<UthanaClient | null>(null);

/**
 * Returns the Uthana client from context (UthanaProvider) or the singleton (createUthanaClient).
 */
export function useUthanaClient(): UthanaClient {
  const fromContext = useContext(UthanaContext);
  if (fromContext) return fromContext;
  return getUthanaClient();
}

export interface UthanaProviderProps {
  apiKey: string;
  options?: UthanaClientOptions;
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
  queryClient: providedQueryClient,
  children,
}: UthanaProviderProps) {
  const client = useMemo(() => createUthanaClient(apiKey, options), [apiKey, options]);

  if (providedQueryClient) {
    return <UthanaContext.Provider value={client}>{children}</UthanaContext.Provider>;
  }

  const queryClient = useMemo(() => new QueryClient(), []);
  return (
    <UthanaContext.Provider value={client}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </UthanaContext.Provider>
  );
}
