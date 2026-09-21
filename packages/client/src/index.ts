/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 *
 * Uthana JS/TS client for the Uthana API.
 */

export { UthanaClient } from "./client";
export type { UthanaClientOptions } from "./client";
export { UthanaError } from "./errors";
export {
  CharactersModule,
  JobsModule,
  MotionDownloadsModule,
  MotionsModule,
  OrgModule,
  TtmModule,
  VtmModule,
} from "./modules/index";
export type {
  Character,
  CharacterPreviewResult,
  CreateCharacterResult,
  CreateFromGeneratedImageResult,
  CreateLocomotionOptions,
  DownloadAllowed,
  Job,
  ModelType,
  Motion,
  MotionCatalog,
  MotionDownloadRecord,
  Org,
  OutputFormat,
  PaygPrice,
  TextToMotionResult,
  TtmJobModelType,
  TtmModelType,
  User,
  VideoToMotionResult,
  VtmModelType,
} from "./types";
export type { PelvisState, Quaternion, StitchParams, Vector3 } from "./stitch";
export { validateStitchParams } from "./stitch";
export {
  DEFAULT_BYTE_UPLOAD_MAX,
  DEFAULT_OUTPUT_FORMAT,
  DEFAULT_TIMEOUT,
  SUPPORTED_VIDEO_FORMATS,
  UthanaCharacters,
} from "./types";
export { detectMeshFormat } from "./utils";
