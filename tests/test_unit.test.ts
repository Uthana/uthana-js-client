/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 */

import { describe, it, expect, vi } from "vitest";
import {
  UthanaError,
  Error as UthanaErrorBase,
  UthanaCharacters,
  detectMeshFormat,
  DEFAULT_OUTPUT_FORMAT,
  SUPPORTED_VIDEO_FORMATS,
} from "@uthana/client";

describe("UthanaError", () => {
  it("creates error with status and message", () => {
    const err = new UthanaError(404, "Not found");
    expect(err).toBeInstanceOf(UthanaErrorBase);
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe("Not found");
  });
});

describe("UthanaCharacters", () => {
  it("has expected character IDs", () => {
    expect(UthanaCharacters.tar).toBe("cXi2eAP19XwQ");
    expect(UthanaCharacters.ava).toBe("cmEE2fT4aSaC");
  });
});

describe("detectMeshFormat", () => {
  it("detects glb from magic", () => {
    const header = new Uint8Array([0x67, 0x6c, 0x54, 0x46, 0, 0, 0, 0]);
    expect(detectMeshFormat(header)).toBe("glb");
  });

  it("detects fbx binary", () => {
    const str = "Kaydara FBX Binary  \0";
    const header = new TextEncoder().encode(str);
    expect(detectMeshFormat(header)).toBe("fbx");
  });

  it("detects fbx ascii", () => {
    const str = "; FBX 7.4.0 project file";
    const header = new TextEncoder().encode(str);
    expect(detectMeshFormat(header)).toBe("fbx");
  });

  it("returns null for unknown", () => {
    const header = new Uint8Array([0, 0, 0, 0, 0]);
    expect(detectMeshFormat(header)).toBeNull();
  });
});

describe("constants", () => {
  it("DEFAULT_OUTPUT_FORMAT is glb", () => {
    expect(DEFAULT_OUTPUT_FORMAT).toBe("glb");
  });

  it("SUPPORTED_VIDEO_FORMATS includes mp4, mov, avi", () => {
    expect(SUPPORTED_VIDEO_FORMATS.has(".mp4")).toBe(true);
    expect(SUPPORTED_VIDEO_FORMATS.has(".mov")).toBe(true);
    expect(SUPPORTED_VIDEO_FORMATS.has(".avi")).toBe(true);
  });
});
