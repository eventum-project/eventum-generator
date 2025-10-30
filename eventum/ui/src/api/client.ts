import axios, { AxiosError } from 'axios';

import { APIError } from './errors';

export const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  timeout: 10_000,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (error instanceof AxiosError) {
      if (error.response === undefined) {
        return Promise.reject(
          new APIError({ message: 'Request failed', details: error.message })
        );
      }

      const statusCode = error.response.status;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const response = error.response.data;

      let message: string;

      // User friendly titles of response codes that make sense to distinguish
      if (statusCode >= 500) {
        message = 'Server error';
      } else if (statusCode === 401) {
        message = 'Invalid credentials';
      } else if (statusCode === 403) {
        message = 'Forbidden';
      } else if (statusCode === 404) {
        message = 'Resource not found';
      } else if (statusCode === 409) {
        message = 'Resource already exists';
      } else if (statusCode === 413) {
        message = 'Content too large';
      } else if (statusCode === 422) {
        message = 'Invalid payload';
      } else {
        message = 'Client error';
      }

      return Promise.reject(
        new APIError({
          message: message,
          details: `Server respond with status code ${error.response.status}`,
          responseBody: response,
          status: statusCode,
        })
      );
    } else if (error instanceof Error) {
      return Promise.reject(
        new APIError({ message: 'Unexpected error', details: error.message })
      );
    } else {
      return Promise.reject(new APIError({ message: 'Unknown error' }));
    }
  }
);
