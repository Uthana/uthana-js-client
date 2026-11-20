/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 */

import type { UthanaClient } from "../client";
import { UthanaError } from "../errors";
import { GET_JOB, LIST_JOBS } from "../graphql";
import type { Job } from "../types";
import { BaseModule } from "./base";

/** Raw shape returned by the GraphQL API before field normalization. */
type RawJob = Omit<Job, "created" | "started" | "ended"> & {
  created_at?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
};

/** Normalize API timestamp fields: `created_at` → `created`, `started_at` → `started`, `ended_at` → `ended`. */
export function transformJob(raw: RawJob): Job {
  const { created_at, started_at, ended_at, ...rest } = raw;
  return {
    ...rest,
    created: created_at ?? null,
    started: started_at ?? null,
    ended: ended_at ?? null,
  };
}

/** Async job polling for video to motion and other long-running operations. */
export class JobsModule extends BaseModule {
  constructor(client: UthanaClient) {
    super(client);
  }

  /** List jobs, optionally filtered by method (e.g. 'VideoToMotion'). */
  async list(method?: string | null): Promise<Job[]> {
    const variables = method != null ? { method } : {};
    const jobs = await this._client._graphql<RawJob[]>(LIST_JOBS, variables, {
      path: "jobs",
      pathDefault: [],
    });
    return jobs.map(transformJob);
  }

  /** Get the status and result of an async job. */
  async get(job_id: string): Promise<Job> {
    const raw = await this._client._graphql<RawJob>(
      GET_JOB,
      { job_id },
      {
        path: "job",
        pathDefault: {},
      },
    );
    return transformJob(raw);
  }

  /** Poll existing work. Timing out stops local polling, not the upstream job. */
  async wait(job_id: string, options?: { intervalMs?: number; timeoutMs?: number }): Promise<Job> {
    const intervalMs = options?.intervalMs === undefined ? 5000 : options.intervalMs;
    const timeoutMs =
      options?.timeoutMs === undefined ? this._client.timeout * 1000 : options.timeoutMs;
    const maxTimerMs = 2147483647;
    for (const [name, value] of [
      ["intervalMs", intervalMs],
      ["timeoutMs", timeoutMs],
    ] as const) {
      if (
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        value <= 0 ||
        value > maxTimerMs
      ) {
        throw new Error(
          `${name} must be positive finite milliseconds, no greater than ${maxTimerMs}`,
        );
      }
    }
    const deadline = performance.now() + timeoutMs;
    const timeoutError = new UthanaError(408, `Job ${job_id} did not finish within ${timeoutMs}ms`);
    for (;;) {
      const remainingMs = deadline - performance.now();
      if (remainingMs <= 0) {
        throw timeoutError;
      }
      let timer: ReturnType<typeof setTimeout> | undefined;
      let job: Job;
      try {
        job = await Promise.race([
          this.get(job_id),
          new Promise<never>((_resolve, reject) => {
            timer = setTimeout(() => reject(timeoutError), Math.ceil(remainingMs));
          }),
        ]);
      } finally {
        clearTimeout(timer);
      }
      const isMissingJob = Object.entries(job).every(
        ([field, value]) => ["created", "started", "ended"].includes(field) && value == null,
      );
      if (isMissingJob) {
        throw new UthanaError(404, `Job ${job_id} was not found or is not accessible`);
      }
      if (typeof job.status !== "string" || !job.status.trim()) {
        throw new UthanaError(
          502,
          `Job ${job_id} returned no valid status; expected a nonempty status string`,
          "invalid_response",
        );
      }
      if (job.status === "FINISHED") {
        return job;
      }
      if (job.status === "FAILED") {
        const result: unknown = job.result;
        const message =
          result !== null && typeof result === "object" && "message" in result
            ? result.message
            : null;
        throw new UthanaError(500, typeof message === "string" ? message : `Job ${job_id} failed`);
      }
      const sleepMs = Math.min(intervalMs, deadline - performance.now());
      if (sleepMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, sleepMs));
      }
    }
  }
}
