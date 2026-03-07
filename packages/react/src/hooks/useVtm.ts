/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 */

import { useMutation } from "@tanstack/react-query";
import type { VtmModelType } from "@uthana/client";
import { useUthanaClient } from "../UthanaProvider.js";

/** Hook for video-to-motion mutations. */
export function useVtm() {
  const client = useUthanaClient();
  return useMutation({
    mutationFn: (params: {
      file: File | Blob | string;
      motion_name?: string | null;
      model?: VtmModelType | null;
    }) => client.vtm.create(params.file, params),
  });
}
