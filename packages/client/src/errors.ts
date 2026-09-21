/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 */

/** Raised when the API returns an error or when client-side validation fails. */
export class UthanaError extends globalThis.Error {
  /** HTTP status code when from API, or 400 for client-side validation errors. */
  readonly statusCode: number;

  /** Raw message from the API response, or the validation message. */
  readonly apiMessage: string;

  /**
   * Error classification for callers that need to decide whether to retry.
   * - http / graphql / invalid_response / response_too_large: safe to treat as failure
   * - uncertain: operation may have succeeded; inspect existing work before resubmitting
   */
  readonly kind:
    | "http"
    | "graphql"
    | "invalid_response"
    | "response_too_large"
    | "uncertain"
    | "client";

  constructor(
    statusCode: number,
    message: string,
    kind:
      | "http"
      | "graphql"
      | "invalid_response"
      | "response_too_large"
      | "uncertain"
      | "client" = "http",
  ) {
    super(`Uthana API error ${statusCode}: ${message}`);
    this.name = "UthanaError";
    this.statusCode = statusCode;
    this.apiMessage = message;
    this.kind = kind;
    Object.setPrototypeOf(this, UthanaError.prototype);
  }
}
