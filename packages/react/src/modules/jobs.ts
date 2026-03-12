/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 */

import { useQuery } from "@tanstack/react-query";
import { useUthanaClient } from "../UthanaProvider";

/** Hook to list jobs. */
export function useUthanaJobs(method?: string | null) {
  const client = useUthanaClient();
  const { data: jobs, ...rest } = useQuery({
    queryKey: ["uthana", "jobs", method] as const,
    queryFn: () => client.jobs.list(method),
  });
  return { jobs, ...rest };
}

/** Hook to get a single job by ID. */
export function useUthanaJob(jobId: string | null) {
  const client = useUthanaClient();
  const { data: job, ...rest } = useQuery({
    queryKey: ["uthana", "job", jobId] as const,
    queryFn: () => client.jobs.get(jobId!),
    enabled: !!jobId,
  });
  return { job, ...rest };
}
