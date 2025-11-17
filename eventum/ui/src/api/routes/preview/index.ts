import {
  VersatileDatetimeParametersBody,
  VersatileDatetimeResponse,
  VersatileDatetimeResponseSchema,
} from './schemas';
import { apiClient } from '@/api/client';
import { validateResponse } from '@/api/wrappers';

export async function normalizeVersatileDatetime(
  name: string,
  parameters: VersatileDatetimeParametersBody
): Promise<VersatileDatetimeResponse> {
  return await validateResponse(
    VersatileDatetimeResponseSchema,
    apiClient.post(`/preview/${name}/versatile-datetime/normalize`, parameters)
  );
}
