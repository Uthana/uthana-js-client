/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 *
 * Loads .env and .env.local before tests. .env.local overrides .env.
 * Use UTHANA_API_KEY and UTHANA_DOMAIN for integration tests.
 */

import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(root, ".env") });
config({ path: resolve(root, ".env.local"), override: true });
