import { AxiosResponse } from 'axios';
import { ZodError, ZodType, z } from 'zod';

import { APIError } from '@/api/errors';

export async function validateResponse<T>(
  schema: ZodType<T>,
  promise: Promise<AxiosResponse>
): Promise<T> {
  const response = await promise;

  try {
    return await schema.parseAsync(response.data);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new APIError({
        message: 'Unexpected server response',
        details:
          'Server respond with body that does not match to defined schema',
        responseValidationErrors: z.treeifyError(error),
      });
    }
    throw error;
  }
}
