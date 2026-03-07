/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 */

import type { UthanaClient } from "../client";
import { UthanaError } from "../errors";
import { GET_JOB, LIST_JOBS } from "../graphql";
import type { Job } from "../types";
import { BaseModule } from "./base";

/** Async job polling for video to motion and other long-running operations. */
export class JobsModule extends BaseModule {
  constructor(client: UthanaClient) {
    super(client);
  }

  /** List jobs, optionally filtered by method (e.g. 'VideoToMotion'). */
  async list(method?: string | null): Promise<Job[]> {
    const variables = method != null ? { method } : {};
    return this._client._graphql<Job[]>(LIST_JOBS, variables, {
      path: "jobs",
      pathDefault: [],
    });
  }

  /** Get the status and result of an async job. */
  async get(job_id: string): Promise<Job> {
    return this._client._graphql<Job>(
      GET_JOB,
      { job_id },
      {
        path: "job",
        pathDefault: {},
      },
    );
  }

  /** Poll until job finishes or fails. Throws UthanaError on FAILED or timeout. */
  async wait(job_id: string, options?: { intervalMs?: number; timeoutMs?: number }): Promise<Job> {
    const intervalMs = options?.intervalMs ?? 5000;
    const timeoutMs = options?.timeoutMs ?? this._client.timeout * 1000;
    const deadline = Date.now() + timeoutMs;

    for (;;) {
      const job = await this.get(job_id);
      const status = job?.status ?? "";

      if (status === "FINISHED") return job;
      if (status === "FAILED") {
        const msg =
          (job?.result as Record<string, unknown>)?.message ?? job?.result ?? "Job failed";
        throw new UthanaError(500, typeof msg === "string" ? msg : JSON.stringify(msg));
      }

      if (Date.now() >= deadline) {
        throw new UthanaError(408, `Job ${job_id} did not finish within ${timeoutMs}ms`);
      }

      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }
}
