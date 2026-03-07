/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 */

import { UthanaError } from "@uthana/client";
import {
  basename,
  extname,
  prepareCreateCharacter,
  prepareVideoToMotion,
  stem,
} from "../packages/client/src/utils.ts";
import { describe, expect, it } from "vitest";

describe("basename", () => {
  it("returns filename from path", () => {
    expect(basename("/foo/bar/baz.glb")).toBe("baz.glb");
    expect(basename("baz.glb")).toBe("baz.glb");
  });
});

describe("stem", () => {
  it("returns name without extension", () => {
    expect(stem("character.glb")).toBe("character");
    expect(stem("foo.bar.fbx")).toBe("foo.bar");
  });
});

describe("extname", () => {
  it("returns extension with dot", () => {
    expect(extname("character.glb")).toBe(".glb");
    expect(extname("dance.MP4")).toBe(".mp4");
  });
});

describe("prepareCreateCharacter", () => {
  it("builds variables with path and options", () => {
    const result = prepareCreateCharacter("/path/to/character.glb", true, false);
    expect(result.name).toBe("character");
    expect(result.ext).toBe("glb");
    expect(result.filename).toBe("character.glb");
    expect(result.variables).toEqual({
      name: "character",
      file: null,
      auto_rig: true,
      auto_rig_front_facing: false,
    });
  });

  it("uses detected format when provided", () => {
    const result = prepareCreateCharacter("character.xyz", null, null, "fbx");
    expect(result.ext).toBe("fbx");
  });

  it("uses extension when present, falls back to glb when no extension", () => {
    const withExt = prepareCreateCharacter("character.xyz", null, null);
    expect(withExt.ext).toBe("xyz");
    const noExt = prepareCreateCharacter("character", null, null);
    expect(noExt.ext).toBe("glb");
  });
});

describe("prepareVideoToMotion", () => {
  it("builds variables for supported format", () => {
    const result = prepareVideoToMotion("/path/to/dance.mp4", "my_dance");
    expect(result.filename).toBe("dance.mp4");
    expect(result.variables).toEqual({
      motion_name: "my_dance",
      file: null,
    });
  });

  it("uses stem as motion name when null", () => {
    const result = prepareVideoToMotion("dance.mp4", null);
    expect(result.variables.motion_name).toBe("dance");
  });

  it("supports .mov and .avi", () => {
    expect(prepareVideoToMotion("clip.mov", null).variables.motion_name).toBe("clip");
    expect(prepareVideoToMotion("clip.avi", null).variables.motion_name).toBe("clip");
  });

  it("throws for unsupported format", () => {
    expect(() => prepareVideoToMotion("clip.wmv", null)).toThrow(UthanaError);
    expect(() => prepareVideoToMotion("clip.wmv", null)).toThrow("Unsupported video format");
  });
});
