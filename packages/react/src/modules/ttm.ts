/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 */

import { useMutation } from "@tanstack/react-query";
import type { TtmModelType } from "@uthana/client";
import { useUthanaClient } from "../UthanaProvider";

/** Hook for text-to-motion mutations. */
export function useUthanaTtm() {
  const client = useUthanaClient();
  return useMutation({
    mutationFn: (params: {
      prompt: string;
      model?: TtmModelType | null;
      character_id?: string | null;
      foot_ik?: boolean | null;
      length?: number | null;
      cfg_scale?: number | null;
      seed?: number | null;
      internal_ik?: boolean | null;
    }) => client.ttm.create(params.prompt, params),
  });
}
