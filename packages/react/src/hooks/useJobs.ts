/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 */

import { useQuery } from "@tanstack/react-query";
import { useUthanaClient } from "../UthanaProvider.js";

/** Hook to list jobs. */
export function useJobs(method?: string | null) {
  const client = useUthanaClient();
  return useQuery({
    queryKey: ["uthana", "jobs", method] as const,
    queryFn: () => client.jobs.list(method),
  });
}

/** Hook to get a single job by ID. */
export function useJob(jobId: string | null) {
  const client = useUthanaClient();
  return useQuery({
    queryKey: ["uthana", "job", jobId] as const,
    queryFn: () => client.jobs.get(jobId!),
    enabled: !!jobId,
  });
}
