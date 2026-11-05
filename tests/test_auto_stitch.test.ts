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
      expect(out.steps[0].transition_duration_seconds).toBe(
        test.normalized.steps[0].transition_duration_seconds,
      );
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
      options.steps[0].transition_duration_seconds = value;
      expect(() => validateStitchInput(options)).toThrow();
    });
  }
});

it("uses the shared mutation and timeout and returns resolved steps", async () => {
  const _graphql = vi.fn().mockResolvedValue({
    motion: { id: "m3" },
    resolved_steps: fixtures.valid[0].normalized.steps,
  });
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

it.each([
  [{ motion: null }, "invalid motion"],
  [{ motion: { id: " " } }, "invalid motion"],
  [{ motion: { id: "m3" } }, "exactly two resolved steps"],
  [{ motion: { id: "m3" }, resolved_steps: [] }, "exactly two resolved steps"],
])("reports invalid stitch results without retry: %j", async (result, message) => {
  const _graphql = vi.fn().mockResolvedValue(result);
  const motions = new MotionsModule({ _graphql } as unknown as UthanaClient);
  await expect(motions.stitch(fixtures.valid[0].input)).rejects.toMatchObject({
    kind: "uncertain",
    message: expect.stringContaining(message as string),
  });
  expect(_graphql).toHaveBeenCalledTimes(1);
});

it("normalizes without mutating caller-owned nested records", () => {
  const input = structuredClone(fixtures.valid[1].input);
  input.steps[0].transition_right_meters = 0.5;
  const original = structuredClone(input);
  const normalized = validateStitchInput(input);
  expect(validateStitchInput(normalized)).toEqual(normalized);
  normalized.steps[0].trim_end_frame = 50;
  normalized.steps[0].transition_right_meters = 10;
  expect(input).toEqual(original);
});
