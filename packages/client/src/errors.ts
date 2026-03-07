/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 */

/** Base exception for Uthana API errors. */
export class Error extends globalThis.Error {
  constructor(message: string) {
    super(message);
    this.name = "Error";
    Object.setPrototypeOf(this, Error.prototype);
  }
}

/** Raised when the API returns an error response. */
export class UthanaError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly message: string
  ) {
    super(`Uthana API error ${statusCode}: ${message}`);
    this.name = "UthanaError";
    Object.setPrototypeOf(this, UthanaError.prototype);
  }
}
