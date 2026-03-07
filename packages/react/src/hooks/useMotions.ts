/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 */

import { useQuery } from "@tanstack/react-query";
import { useUthanaClient } from "../UthanaProvider.js";

const MOTIONS_QUERY_KEY = ["uthana", "motions"] as const;

/** Hook to list motions. */
export function useMotions() {
  const client = useUthanaClient();
  return useQuery({
    queryKey: MOTIONS_QUERY_KEY,
    queryFn: () => client.motions.list(),
  });
}
