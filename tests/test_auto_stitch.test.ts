import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { validateStitchInput, type StitchInput } from "../packages/client/src/stitch";
import { MotionsModule } from "../packages/client/src/modules/motions";
import type { UthanaClient } from "../packages/client/src/client";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures/stitch_contract.json", import.meta.url), "utf8"),
);

describe("shared typed-step stitching", () => {
  for (const test of fixtures.valid) {
    it(`accepts ${test.name}`, () => {
      const out = validateStitchInput(test.input);
      expect(out.steps[1].duration_seconds).toBe(test.input.steps[1].duration_seconds ?? 1);
      expect(out).not.toBe(test.input);
      expect(out).toEqual(test.normalized);
    });
  }
  for (const test of fixtures.invalid) {
    it(`rejects ${test.name}`, () => expect(() => validateStitchInput(test.input)).toThrow());
  }
  for (const value of [NaN, Infinity, -Infinity]) {
    it(`rejects ${value}`, () => {
      const options = structuredClone(fixtures.valid[0].input);
      options.steps[1].duration_seconds = value;
      expect(() => validateStitchInput(options)).toThrow();
    });
  }
});

it("uses the shared mutation and timeout and returns resolved steps", async () => {
  const _graphql = vi.fn().mockResolvedValue({ motion: { id: "m3" }, resolved_steps: [] });
  const motions = new MotionsModule({ _graphql } as unknown as UthanaClient);
  const input = fixtures.valid[0].input as StitchInput;
  const result = await motions.stitch(input);
  expect(result.motion.id).toBe("m3");
  expect(_graphql).toHaveBeenCalledWith(
    expect.stringContaining("stitch(input: $input)"),
    { input: validateStitchInput(input) },
    { path: "stitch", timeoutSeconds: 360 },
  );
});

it("treats missing motion as uncertain without retry", async () => {
  const _graphql = vi.fn().mockResolvedValue({ motion: null });
  const motions = new MotionsModule({ _graphql } as unknown as UthanaClient);
  await expect(motions.stitch(fixtures.valid[0].input)).rejects.toMatchObject({
    kind: "uncertain",
  });
  expect(_graphql).toHaveBeenCalledTimes(1);
});
