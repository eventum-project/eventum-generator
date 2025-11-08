import {
  GeneratorConfig,
  GeneratorConfigSchema,
  GeneratorDirsExtendedInfo,
  GeneratorDirsExtendedInfoSchema,
} from './schemas';
import { apiClient } from '@/api/client';
import '@/api/routes/instance/schemas';
import { validateResponse } from '@/api/wrappers';

export async function listGeneratorDirs(): Promise<GeneratorDirsExtendedInfo> {
  return await validateResponse(
    GeneratorDirsExtendedInfoSchema,
    apiClient.get('/generator-configs/', { params: { extended: true } })
  );
}

export async function getGeneratorConfig(
  name: string
): Promise<GeneratorConfig> {
  return await validateResponse(
    GeneratorConfigSchema,
    apiClient.get(`/generator-configs/${name}`)
  );
}

export async function createGeneratorConfig(
  name: string,
  config: GeneratorConfig
): Promise<undefined> {
  await apiClient.post(`/generator-configs/${name}`, config);
}

export async function updateGeneratorConfig(
  name: string,
  config: GeneratorConfig
): Promise<undefined> {
  await apiClient.put(`/generator-configs/${name}`, config);
}

export async function deleteGeneratorConfig(name: string): Promise<undefined> {
  await apiClient.delete(`/generator-configs/${name}`);
}
