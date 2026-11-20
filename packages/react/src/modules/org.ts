/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 */

import type { UseQueryResult } from "@tanstack/react-query";
import type { LedgerEntry, LedgerOptions } from "@uthana/client";

import { useQuery } from "@tanstack/react-query";
import { useUthanaClient, useUthanaQueryScope } from "../UthanaProvider";

const USER_QUERY_KEY = ["uthana", "user"] as const;
const ORG_QUERY_KEY = ["uthana", "org"] as const;

/** Hook to get current user. */
export function useUthanaUser() {
  const client = useUthanaClient();
  const { data: user, ...rest } = useQuery({
    queryKey: USER_QUERY_KEY,
    queryFn: () => client.org.getUser(),
  });
  return { user, ...rest };
}

/** Hook to get current org. */
export function useUthanaOrg() {
  const client = useUthanaClient();
  const { data: org, ...rest } = useQuery({
    queryKey: ORG_QUERY_KEY,
    queryFn: () => client.org.getOrg(),
  });
  return { org, ...rest };
}

/** Hook for quotas, subscription, PAYG balance, and nested prices. */
export function useUthanaUsage() {
  const client = useUthanaClient();
  const { data: usage, ...rest } = useQuery({
    queryKey: ["uthana", "usage"] as const,
    queryFn: () => client.org.getUsage(),
  });
  return { usage, ...rest };
}

/** Hook for current PAYG model prices. */
export function useUthanaPrices() {
  const client = useUthanaClient();
  const { data: prices, ...rest } = useQuery({
    queryKey: ["uthana", "prices"] as const,
    queryFn: () => client.org.getPrices(),
  });
  return { prices, ...rest };
}

/** Read one ledger page; filters and page position are part of its cache key. */
export function useUthanaLedger(options: LedgerOptions = {}): UseQueryResult<LedgerEntry[], Error> {
  const client = useUthanaClient();
  const scope = useUthanaQueryScope(client);
  return useQuery({
    queryKey: ["uthana", "ledger", scope, options],
    queryFn: () => client.org.getLedger(options),
    retry: false,
  });
}
