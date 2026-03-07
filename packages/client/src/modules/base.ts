/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 */

import type { UthanaClient } from "../client.js";

/** Base class for all Uthana modules. */
export abstract class BaseModule {
  constructor(protected readonly _client: UthanaClient) {}
}

