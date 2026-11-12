import { UthanaClient } from "@uthana/client";
import { afterEach, expect, it, vi } from "vitest";

afterEach(() => vi.unstubAllGlobals());

it.each(["character", "motion"])(
  "surfaces a %s 404 without replaying the request",
  async (kind) => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: { [kind]: null },
          errors: [{ type: "ResourceNotFound", message: "Resource not found." }],
        }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetch);
    const client = new UthanaClient("offline-key");
    await expect(client._graphql(`query { ${kind}(id: "missing") { id } }`)).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(1);
  },
);
