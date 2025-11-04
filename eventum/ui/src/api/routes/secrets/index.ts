import {
  SecretNames,
  SecretNamesSchema,
  SecretValue,
  SecretValueSchema,
} from './schemas';
import { apiClient } from '@/api/client';
import { validateResponse } from '@/api/wrappers';

export async function getSecretValue(name: string): Promise<SecretValue> {
  return await validateResponse(
    SecretValueSchema,
    apiClient.get(`/secrets/${name}`)
  );
}

export async function getSecretNames(): Promise<SecretNames> {
  return await validateResponse(SecretNamesSchema, apiClient.get(`/secrets/`));
}

export async function setSecretValue(
  name: string,
  value: string
): Promise<undefined> {
  await apiClient.put(`/secrets/${name}`, JSON.stringify(value));
}

export async function deleteSecretValue(name: string): Promise<undefined> {
  await apiClient.delete(`/secrets/${name}`);
}
