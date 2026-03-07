/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 */

import type { ReactNode } from "react";
import { createContext, useContext, useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { UthanaClient, UthanaClientOptions } from "@uthana/client";
import { createUthanaClient } from "./client.js";

const UthanaContext = createContext<UthanaClient | null>(null);

export function useUthanaClient(): UthanaClient {
  const client = useContext(UthanaContext);
  if (!client) {
    throw new Error("useUthanaClient must be used within UthanaProvider");
  }
  return client;
}

export interface UthanaProviderProps {
  apiKey: string;
  options?: UthanaClientOptions;
  queryClient?: QueryClient;
  children: ReactNode;
}

/**
 * Provider that supplies the Uthana client and react-query to the tree.
 * Wrap your app (or the part that needs Uthana) with this.
 */
export function UthanaProvider({
  apiKey,
  options,
  queryClient: providedQueryClient,
  children,
}: UthanaProviderProps) {
  const client = useMemo(() => createUthanaClient(apiKey, options), [apiKey, options]);
  const queryClient = useMemo(
    () => providedQueryClient ?? new QueryClient(),
    [providedQueryClient]
  );

  return (
    <UthanaContext.Provider value={client}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </UthanaContext.Provider>
  );
}
