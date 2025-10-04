import { $ZodIssue } from 'zod/v4/core';

export class ApiError extends Error {
  constructor(
    message: string,
    public cause?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NetworkError extends ApiError {
  constructor(cause?: unknown) {
    super('Request failed', cause);
  }
}

export class HttpError extends ApiError {
  constructor(
    public statusCode: number,
    public statusText: string,
    cause?: unknown
  ) {
    super(`HTTP ${statusCode}: ${statusText}`, cause);
  }
}

export class ValidationError extends ApiError {
  constructor(
    public issues: $ZodIssue[],
    cause?: unknown
  ) {
    super('Response validation failed', cause);
  }
}
