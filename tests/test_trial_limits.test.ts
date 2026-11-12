import { UthanaClient, UthanaError } from "@uthana/client";
import { afterEach, expect, it, vi } from "vitest";

afterEach(() => vi.unstubAllGlobals());

it("preserves HTTP 429 on a video upload without replaying it", async () => {
  const message = "Wait for your queued or running jobs to complete.";
  const fetch = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        data: null,
        errors: [{ type: "JobLimitExceeded", code: "job_limit_exceeded", message }],
      }),
      { status: 429 },
    ),
  );
  vi.stubGlobal("fetch", fetch);
  const client = new UthanaClient("offline-key");
  try {
    await client.vtm.create(new Blob(["video"]), { motion_name: "Test" });
    expect.fail("Expected trial admission rejection");
  } catch (error) {
    expect(error).toBeInstanceOf(UthanaError);
    if (!(error instanceof UthanaError)) {
      throw error;
    }
    expect(error.statusCode).toBe(429);
    expect(error.apiMessage).toContain("job_limit_exceeded");
    expect(error.apiMessage).toContain(message);
  }
  expect(fetch).toHaveBeenCalledTimes(1);
});
