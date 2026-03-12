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
  Job,
  ModelType,
  Motion,
  MotionDownloadRecord,
  Org,
  OutputFormat,
  TextToMotionResult,
  TtmModelType,
  User,
  VideoToMotionResult,
  VtmModelType,
} from "./types";
export {
  DEFAULT_OUTPUT_FORMAT,
  DEFAULT_TIMEOUT,
  SUPPORTED_VIDEO_FORMATS,
  UthanaCharacters,
} from "./types";
export { detectMeshFormat } from "./utils";
