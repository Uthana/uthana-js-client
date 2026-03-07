/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 *
 * Integration tests against the real Uthana API.
 * Skipped unless UTHANA_API_KEY is set.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { UthanaClient } from "@uthana/client";

const API_KEY = process.env.UTHANA_API_KEY;
const DOMAIN = process.env.UTHANA_DOMAIN;

const shouldRun = !!API_KEY && API_KEY !== "xxx";

describe.skipIf(!shouldRun)("UthanaClient integration", () => {
  let client: UthanaClient;

  beforeAll(() => {
    client = new UthanaClient(API_KEY!, {
      domain: DOMAIN ?? undefined,
    });
  });

  it("org.get_user returns user", async () => {
    const user = await client.org.get_user();
    expect(user).toBeDefined();
    expect(typeof user?.id).toBe("string");
  });

  it("org.get_org returns org", async () => {
    const org = await client.org.get_org();
    expect(org).toBeDefined();
    expect(typeof org?.id).toBe("string");
  });

  it("motions.list returns array", async () => {
    const motions = await client.motions.list();
    expect(Array.isArray(motions)).toBe(true);
  });

  it("characters.list returns array", async () => {
    const characters = await client.characters.list();
    expect(Array.isArray(characters)).toBe(true);
  });

  it("jobs.list returns array", async () => {
    const jobs = await client.jobs.list();
    expect(Array.isArray(jobs)).toBe(true);
  });
});
