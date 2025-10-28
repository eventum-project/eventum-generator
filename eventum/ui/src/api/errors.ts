export interface APIErrorOptions {
  message: string;
  details?: string;
  status?: number;
  responseBody?: unknown;
  responseValidationErrors?: unknown;
}

export class APIError extends Error {
  public override readonly name = 'APIError';
  public readonly details?: string;
  public readonly status?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public readonly responseBody?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public readonly responseValidationErrors?: any;

  constructor({
    message,
    details,
    status,
    responseBody,
    responseValidationErrors,
  }: APIErrorOptions) {
    super(message);
    this.details = details;
    this.status = status;
    this.responseBody = responseBody;
    this.responseValidationErrors = responseValidationErrors;

    Object.setPrototypeOf(this, new.target.prototype);
  }

  isAuthError(): this is this & { status: 401 } {
    return this.status === 401;
  }

  isServerError(): this is this & { status: number } {
    return this.status !== undefined && this.status >= 500;
  }

  isClientError(): this is this & { status: number } {
    return this.status !== undefined && this.status >= 400 && this.status < 500;
  }

  isResponseValidationError(): boolean {
    return this.responseValidationErrors !== undefined;
  }
}
