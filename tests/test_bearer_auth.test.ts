import { UthanaClient } from "@uthana/client";
import { afterEach, expect, it, vi } from "vitest";
import { createUthanaClient } from "../packages/react/src/client";

const { headers, mockGql } = vi.hoisted(() => ({
  headers: [] as unknown[],
  mockGql: vi.fn().mockResolvedValue({ data: {} }),
}));
vi.mock("graffle", () => ({
  Graffle: {
    create: () => {
      const chain = {
        transport: (config: { headers: unknown }) => {
          if (config.headers) {
            headers.push(config.headers);
          }
          return chain;
        },
        use: () => chain,
        gql: () => ({ $send: mockGql }),
      };
      return chain;
    },
  },
}));
vi.mock("graffle/extensions/throws", () => ({ Throws: {} }));
afterEach(() => vi.unstubAllGlobals());
it("uses bearer headers for GraphQL, uploads and downloads", async () => {
  const client = new UthanaClient("", { accessToken: " delegated-token " });
  expect(headers.at(-1)).toEqual({ Authorization: "Bearer delegated-token" });
  const request = vi
    .fn()
    .mockImplementation((_url, init) =>
      Promise.resolve(
        new Response(
          init.body instanceof FormData ? JSON.stringify({ data: { upload: { id: "x" } } }) : "csv",
          { status: 200 },
        ),
      ),
    );
  vi.stubGlobal("fetch", request);
  await client._graphqlUpload(
    "mutation Upload { upload { id } }",
    { file: null },
    "file",
    new Blob(["data"]),
  );
  await client.motions.downloadRobot("c", "m");
  expect(request).toHaveBeenCalledTimes(2);
  for (const [, init] of request.mock.calls)
    expect(init.headers.Authorization).toBe("Bearer delegated-token");
  expect(headers.at(-1)).not.toHaveProperty("apiKey");
});
it("preserves Basic authentication", () => {
  new UthanaClient("test-key");
  expect(headers.at(-1)).toEqual({ Authorization: `Basic ${btoa("test-key:")}` });
});
it.each(["", " ", "two tokens", "line\nbreak", 5, null])(
  "rejects malformed tokens %s",
  (accessToken) => {
    // @ts-expect-error Exercise untrusted runtime input.
    expect(() => new UthanaClient("", { accessToken })).toThrow("accessToken");
  },
);
it("rejects mixed credentials and replaces singleton on changed options", () => {
  expect(() => new UthanaClient("key", { accessToken: "token" })).toThrow("either");
  const options = { accessToken: "one" };
  const first = createUthanaClient("", options);
  expect(createUthanaClient("", { accessToken: "one" })).toBe(first);
  options.accessToken = "two";
  const refreshed = createUthanaClient("", options);
  expect(refreshed).not.toBe(first);
  expect(createUthanaClient("", { accessToken: "two", domain: "example.com" })).not.toBe(refreshed);
});

it("reuses clients for equivalent options regardless of order or explicit defaults", () => {
  const first = createUthanaClient("", { accessToken: "token", domain: "uthana.com" });
  expect(createUthanaClient("", { domain: "uthana.com", accessToken: "token" })).toBe(first);
  expect(createUthanaClient("", { accessToken: " token " })).toBe(first);
});
