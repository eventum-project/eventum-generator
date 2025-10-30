import { AxiosRequestConfig, AxiosResponse } from 'axios';

export interface APIErrorOptions {
  message: string;
  details?: string;
  response?: AxiosResponse;
  requestConfig?: AxiosRequestConfig;
  responseValidationErrors?: {
    errors: string[];
  };
}

export class APIError extends Error {
  public override readonly name = 'APIError';
  public readonly details?: string;
  public readonly response?: AxiosResponse;
  public readonly requestConfig?: AxiosRequestConfig;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public readonly responseValidationErrors?: any;

  constructor({
    message,
    details,
    response,
    requestConfig,
    responseValidationErrors,
  }: APIErrorOptions) {
    super(message);
    this.details = details;
    this.response = response;
    this.requestConfig = requestConfig;
    this.responseValidationErrors = responseValidationErrors;

    Object.setPrototypeOf(this, new.target.prototype);
  }

  isAuthError(): this is this & { status: 401 } {
    return this.response?.status === 401;
  }

  isServerError(): this is this & { status: number } {
    return this.response?.status !== undefined && this.response.status >= 500;
  }

  isClientError(): this is this & { status: number } {
    return (
      this.response?.status !== undefined &&
      this.response.status >= 400 &&
      this.response.status < 500
    );
  }

  isResponseValidationError(): boolean {
    return this.responseValidationErrors !== undefined;
  }
}
