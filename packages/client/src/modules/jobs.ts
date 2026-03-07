/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 */

import { GET_JOB, LIST_JOBS } from "../graphql.js";
import type { UthanaClient } from "../client.js";
import type { Job } from "../types.js";
import { BaseModule } from "./base.js";

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
    return this._client._graphql<Job>(GET_JOB, { job_id }, {
      path: "job",
      pathDefault: {},
    });
  }
}
