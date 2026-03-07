/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 */

import type { UthanaClient, UthanaClientOptions } from "@uthana/client";
import { UthanaClient as UthanaClientClass } from "@uthana/client";

let clientInstance: UthanaClient | null = null;

/**
 * Create or return the singleton Uthana client for React apps.
 * Call this once (e.g. in a root layout or provider) with your API key.
 * Returns null when called in SSR (typeof window === "undefined") if you prefer to defer client creation.
 */
export function createUthanaClient(
  apiKey: string,
  options?: UthanaClientOptions
): UthanaClient {
  if (clientInstance) {
    return clientInstance;
  }
  clientInstance = new UthanaClientClass(apiKey, options);
  return clientInstance;
}

/**
 * Get the current singleton client. Throws if createUthanaClient was never called.
 */
export function getUthanaClient(): UthanaClient {
  if (!clientInstance) {
    throw new Error("Uthana client not initialized. Call createUthanaClient(apiKey) first.");
  }
  return clientInstance;
}
