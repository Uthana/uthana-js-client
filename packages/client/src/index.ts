/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 *
 * Uthana JS/TS client for the Uthana API.
 */

export { UthanaClient } from "./client.js";
export type { UthanaClientOptions } from "./client.js";
export { Error, UthanaError } from "./errors.js";
export {
  CharactersModule,
  JobsModule,
  MotionsModule,
  OrgModule,
  TtmModule,
  VtmModule,
} from "./modules/index.js";
export type {
  Character,
  CreateCharacterResult,
  Job,
  ModelType,
  Motion,
  Org,
  OutputFormat,
  TextToMotionResult,
  TtmModelType,
  User,
  VideoToMotionResult,
  VtmModelType,
} from "./types.js";
export {
  DEFAULT_OUTPUT_FORMAT,
  DEFAULT_TIMEOUT,
  SUPPORTED_VIDEO_FORMATS,
  UthanaCharacters,
} from "./types.js";
export { detectMeshFormat } from "./utils.js";
