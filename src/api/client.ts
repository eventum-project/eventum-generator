import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { ZodError, ZodType, infer as zInfer } from 'zod';

import { ApiError, HttpError, NetworkError, ValidationError } from './errors';
import { InstanceInfo, InstanceInfoSchema } from '@/models/instances';

export interface ApiConfig {
  protocol: 'http' | 'https';
  host: string;
  port: number;
  username: string;
  password: string;
}

export class ApiClient {
  private axios: AxiosInstance;

  constructor(config: ApiConfig) {
    const basePath = 'api';
    const baseHTTPURL = `${config.protocol}://${config.host}:${config.port}/${basePath}`;

    this.axios = axios.create({
      baseURL: baseHTTPURL,
      headers: { 'Content-Type': 'application/json' },
      auth: {
        username: config.username,
        password: config.password,
      },
    });
  }

  private async request<S extends ZodType<any, any, any>>(
    config: AxiosRequestConfig,
    schema?: S
  ): Promise<zInfer<S>> {
    let resp;

    try {
      resp = await this.axios.request(config);
    } catch (error) {
      if (!axios.isAxiosError(error)) {
        throw new ApiError('Unexpected API error', error);
      }

      if (error.response) {
        throw new HttpError(
          error.response.status,
          error.response.statusText,
          error
        );
      } else {
        throw new NetworkError(error);
      }
    }

    if (!schema) {
      return resp.data;
    }

    try {
      return schema.parse(resp.data);
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        throw new ValidationError(error.issues, error);
      }
      throw new ValidationError([], error);
    }
  }

  async getInstanceInfo(): Promise<InstanceInfo> {
    return this.request(
      { url: '/instance/info', method: 'GET' },
      InstanceInfoSchema
    );
  }
}
