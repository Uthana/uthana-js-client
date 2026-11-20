/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 */

import type { UthanaClient, UthanaClientOptions } from "@uthana/client";
import { UthanaClient as UthanaClientClass } from "@uthana/client";

let clientInstance: UthanaClient | null = null;
let clientOptionsKey: string | undefined;

/**
 * Create or return the singleton Uthana client for React apps.
 * Call this once (e.g. in a root layout or provider) with your API key.
 * Credentials or request options changing replaces the singleton.
 */
export function createUthanaClient(apiKey: string, options?: UthanaClientOptions): UthanaClient {
  const optionsKey = JSON.stringify(options ?? {});
  if (clientInstance && (clientInstance.apiKey !== apiKey || clientOptionsKey !== optionsKey)) {
    clientInstance = null;
  }
  if (!clientInstance) {
    clientInstance = new UthanaClientClass(apiKey, options);
    clientOptionsKey = optionsKey;
  }
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

// Cache identity only: query keys must never contain API keys or access tokens.
const CLIENT_SCOPE_SESSION = Math.random().toString(36).slice(2);
const clientScopes = new WeakMap<UthanaClient, string>();
let scopeSequence = 0;

export function getUthanaClientScope(client: UthanaClient): string {
  let scope = clientScopes.get(client);
  if (scope === undefined) {
    scope = `${CLIENT_SCOPE_SESSION}-${++scopeSequence}`;
    clientScopes.set(client, scope);
  }
  return scope;
}
