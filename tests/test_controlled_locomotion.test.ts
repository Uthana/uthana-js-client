import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import {
  normalizeControlledLocomotionPlan,
  controlledLocomotionOptions,
} from "../packages/client/src/controlled-locomotion";
import { MotionsModule } from "../packages/client/src/modules/motions";
import type { UthanaClient } from "../packages/client/src/client";
import type { ControlledLocomotionPlan } from "../packages/client/src/controlled-locomotion";

const cases = JSON.parse(
  readFileSync(new URL("./fixtures/controlled_locomotion.json", import.meta.url), "utf8"),
);
const plan: ControlledLocomotionPlan = cases[0].input;
const character = "cH32hVsowEyB";

describe("controlled locomotion", () => {
  for (const entry of cases) {
    it(entry.name, () => {
      const original = structuredClone(entry.input);
      if (entry.valid) {
        const result = normalizeControlledLocomotionPlan(entry.input);
        expect(result).toEqual(entry.normalized);
        result.points[0].right = 1;
      } else {
        expect(() => normalizeControlledLocomotionPlan(entry.input)).toThrow();
      }
      expect(entry.input).toEqual(original);
    });
  }
  it.each([NaN, Infinity, -Infinity])("rejects nonfinite %s", (speed) => {
    const input = structuredClone(plan);
    input.pace_changes[0].speed_mps = speed;
    expect(() => normalizeControlledLocomotionPlan(input)).toThrow();
  });
  it("catalog is a fresh offline value", () => {
    const result = controlledLocomotionOptions();
    (result.styles as string[]).length = 0;
    expect(controlledLocomotionOptions().styles).not.toEqual([]);
  });
  it("submits normalized plan and returns the job", async () => {
    const job = { id: "j1", status: "PENDING" };
    const graphql = vi.fn().mockResolvedValue(job);
    const motions = new MotionsModule({ _graphql: graphql } as unknown as UthanaClient);
    expect(await motions.createControlledLocomotion(character, { plan })).toEqual(job);
    expect(graphql).toHaveBeenCalledOnce();
    expect(graphql.mock.calls[0][0]).toContain("create_controlled_locomotion_job");
    expect(graphql.mock.calls[0][1]).toEqual({
      character_id: character,
      plan: cases[0].normalized,
    });
    expect(graphql.mock.calls[0][2]).toEqual({ path: "create_controlled_locomotion_job.job" });
  });
  it.each([null, {}, { id: "" }, { id: 7 }, { id: "  " }])(
    "marks malformed receipt uncertain",
    async (job) => {
      const graphql = vi.fn().mockResolvedValue(job);
      const motions = new MotionsModule({ _graphql: graphql } as unknown as UthanaClient);
      await expect(motions.createControlledLocomotion(character, { plan })).rejects.toMatchObject({
        kind: "uncertain",
      });
      expect(graphql).toHaveBeenCalledOnce();
    },
  );
  it("does not retry unknown outcomes", async () => {
    const graphql = vi.fn().mockRejectedValue(new Error("timeout"));
    const motions = new MotionsModule({ _graphql: graphql } as unknown as UthanaClient);
    await expect(motions.createControlledLocomotion(character, { plan })).rejects.toThrow(
      "timeout",
    );
    expect(graphql).toHaveBeenCalledOnce();
  });
  it("validates before transport", async () => {
    const graphql = vi.fn();
    const motions = new MotionsModule({ _graphql: graphql } as unknown as UthanaClient);
    await expect(motions.createControlledLocomotion("unsupported", { plan })).rejects.toThrow();
    await expect(
      motions.createControlledLocomotion(character, { plan: { ...plan, points: [] } }),
    ).rejects.toThrow();
    expect(graphql).not.toHaveBeenCalled();
  });
});

it.each([true, false])("reads live enabled=%s", async (enabled) => {
  const options = { enabled, supported_character_ids: [character] };
  const graphql = vi.fn().mockResolvedValue(options);
  const motions = new MotionsModule({ _graphql: graphql } as unknown as UthanaClient);
  expect(await motions.getControlledLocomotionOptions()).toEqual(options);
  expect(graphql.mock.calls[0][0]).toContain("controlled_locomotion_options");
});

it.each([null, {}, { enabled: 1 }, { enabled: "true" }])(
  "rejects invalid discovery",
  async (options) => {
    const graphql = vi.fn().mockResolvedValue(options);
    const motions = new MotionsModule({ _graphql: graphql } as unknown as UthanaClient);
    await expect(motions.getControlledLocomotionOptions()).rejects.toThrow();
  },
);
