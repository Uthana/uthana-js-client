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
