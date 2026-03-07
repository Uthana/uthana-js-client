/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 */

/** Raised when the API returns an error or when client-side validation fails. */
export class UthanaError extends globalThis.Error {
  /** HTTP status code when from API, or 400 for client-side validation errors. */
  readonly statusCode: number;

  /** Raw message from the API response, or the validation message. */
  readonly apiMessage: string;

  constructor(statusCode: number, message: string) {
    super(`Uthana API error ${statusCode}: ${message}`);
    this.name = "UthanaError";
    this.statusCode = statusCode;
    this.apiMessage = message;
    Object.setPrototypeOf(this, UthanaError.prototype);
  }
}
