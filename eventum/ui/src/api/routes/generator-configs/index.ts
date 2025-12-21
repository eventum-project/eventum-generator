import {
  FileNode,
  FileNodesListSchema,
  GeneratorConfig,
  GeneratorConfigPathSchema,
  GeneratorConfigSchema,
  GeneratorDirsExtendedInfo,
  GeneratorDirsExtendedInfoSchema,
  GeneratorFileContent,
  GeneratorFileContentSchema,
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
) {
  await apiClient.post(`/generator-configs/${name}`, config);
}

export async function updateGeneratorConfig(
  name: string,
  config: GeneratorConfig
) {
  await apiClient.put(`/generator-configs/${name}`, config);
}

export async function deleteGeneratorConfig(name: string) {
  await apiClient.delete(`/generator-configs/${name}`);
}

export async function getGeneratorConfigPath(name: string): Promise<string> {
  return await validateResponse(
    GeneratorConfigPathSchema,
    apiClient.get(`/generator-configs/${name}/path`)
  );
}

export async function getGeneratorFileTree(name: string): Promise<FileNode[]> {
  return (await validateResponse(
    FileNodesListSchema,
    apiClient.get(`/generator-configs/${name}/file-tree`)
  )) as FileNode[];
}

export async function getGeneratorFile(
  name: string,
  filepath: string
): Promise<GeneratorFileContent> {
  return await validateResponse(
    GeneratorFileContentSchema,
    apiClient.get(`/generator-configs/${name}/file/${filepath}`, {
      responseType: 'text',
    })
  );
}

export async function uploadGeneratorFile(
  name: string,
  filepath: string,
  content: string
) {
  const form = new FormData();
  form.append('content', new Blob([content], { type: 'text/plain' }));

  await apiClient.post(`/generator-configs/${name}/file/${filepath}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export async function putGeneratorFile(
  name: string,
  filepath: string,
  content: string
) {
  const form = new FormData();
  form.append('content', new Blob([content], { type: 'text/plain' }));

  await apiClient.put(`/generator-configs/${name}/file/${filepath}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export async function deleteGeneratorFile(name: string, filepath: string) {
  await apiClient.delete(`/generator-configs/${name}/file/${filepath}`);
}

export async function moveGeneratorFile(
  name: string,
  source: string,
  destination: string
) {
  await apiClient.post(`/generator-configs/${name}/file-move/`, undefined, {
    params: {
      source,
      destination,
    },
  });
}

export async function copyGeneratorFile(
  name: string,
  source: string,
  destination: string
) {
  await apiClient.post(`/generator-configs/${name}/file-copy`, {
    source,
    destination,
  });
}
