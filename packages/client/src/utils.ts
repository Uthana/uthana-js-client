/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 */

import { Error } from "./errors.js";
import { SUPPORTED_VIDEO_FORMATS } from "./types.js";

/** Detect mesh format from file header. Returns 'glb', 'fbx', or null if unknown. */
export function detectMeshFormat(header: Uint8Array): "glb" | "fbx" | null {
  if (header.byteLength >= 4) {
    const view = new DataView(header.buffer, header.byteOffset, header.byteLength);
    // "glTF" as bytes 0x67 0x6c 0x54 0x46, read as little-endian uint32
    if (view.getUint32(0, true) === 0x46546c67) return "glb";
  }
  const str = new TextDecoder().decode(header.slice(0, 20));
  if (str.startsWith("Kaydara FBX Binary")) return "fbx";
  if (str.startsWith("; FBX")) return "fbx";
  return null;
}

/** Get filename from path. */
export function basename(path: string): string {
  const i = path.lastIndexOf("/");
  return i >= 0 ? path.slice(i + 1) : path;
}

/** Get name without extension from filename. */
export function stem(filename: string): string {
  const i = filename.lastIndexOf(".");
  return i >= 0 ? filename.slice(0, i) : filename;
}

/** Get extension from filename (lowercase, with dot). */
export function extname(filename: string): string {
  const i = filename.lastIndexOf(".");
  return i >= 0 ? filename.slice(i).toLowerCase() : "";
}

export interface PrepareCreateCharacterResult {
  variables: Record<string, unknown>;
  name: string;
  ext: string;
  filename: string;
}

/** Prepare variables and metadata for create_character mutation. */
export function prepareCreateCharacter(
  filePathOrName: string,
  autoRig: boolean | null,
  frontFacing: boolean | null,
  detectedFormat?: "glb" | "fbx" | null
): PrepareCreateCharacterResult {
  const filename = basename(filePathOrName);
  const name = stem(filename);
  const ext =
    detectedFormat ?? (extname(filename).replace(".", "") || "glb");

  const variables: Record<string, unknown> = {
    name,
    file: null,
    auto_rig: autoRig,
    auto_rig_front_facing: frontFacing,
  };
  return { variables, name, ext, filename };
}

export interface PrepareVideoToMotionResult {
  variables: Record<string, unknown>;
  filename: string;
}

/** Validate video format and build variables for create_video_to_motion. */
export function prepareVideoToMotion(
  filePathOrName: string,
  motionName: string | null
): PrepareVideoToMotionResult {
  const filename = basename(filePathOrName);
  const ext = extname(filename);
  if (!SUPPORTED_VIDEO_FORMATS.has(ext)) {
    const supported = [...SUPPORTED_VIDEO_FORMATS].sort().join(", ");
    throw new Error(`Unsupported video format '${ext}'. Supported: ${supported}`);
  }
  const name = motionName ?? stem(filename);
  return {
    variables: { motion_name: name, file: null },
    filename,
  };
}
