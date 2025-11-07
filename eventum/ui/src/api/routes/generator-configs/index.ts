import {
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

export async function deleteGeneratorConfig(name: string): Promise<undefined> {
  await apiClient.delete(`/generator-configs/${name}`);
}
