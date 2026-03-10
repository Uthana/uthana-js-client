/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 */

import { useQuery } from "@tanstack/react-query";
import { useUthanaClient } from "../UthanaProvider";

const MOTION_DOWNLOADS_QUERY_KEY = ["uthana", "motion_downloads"] as const;

/** Hook to list motion downloads. */
export function useUthanaMotionDownloads() {
  const client = useUthanaClient();
  return useQuery({
    queryKey: MOTION_DOWNLOADS_QUERY_KEY,
    queryFn: () => client.motionDownloads.list(),
  });
}

/** Hook to check if a motion download is allowed for a character. Disabled when characterId or motionId is null. */
export function useUthanaIsMotionDownloadAllowed(characterId: string | null, motionId: string | null) {
  const client = useUthanaClient();
  return useQuery({
    queryKey: ["uthana", "motion_download_allowed", characterId, motionId] as const,
    queryFn: () => client.motionDownloads.isAllowed(characterId ?? "", motionId ?? ""),
    enabled: characterId != null && characterId !== "" && motionId != null && motionId !== "",
  });
}
