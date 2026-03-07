/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 */

import { useQuery } from "@tanstack/react-query";
import { useUthanaClient } from "../UthanaProvider";

const USER_QUERY_KEY = ["uthana", "user"] as const;
const ORG_QUERY_KEY = ["uthana", "org"] as const;

/** Hook to get current user. */
export function useUthanaUser() {
  const client = useUthanaClient();
  return useQuery({
    queryKey: USER_QUERY_KEY,
    queryFn: () => client.org.get_user(),
  });
}

/** Hook to get current org. */
export function useUthanaOrg() {
  const client = useUthanaClient();
  return useQuery({
    queryKey: ORG_QUERY_KEY,
    queryFn: () => client.org.get_org(),
  });
}
