import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { GeneratorConfig } from '../routes/generator-configs/schemas';
import {
  copyGeneratorFile,
  createGeneratorConfig,
  deleteGeneratorConfig,
  deleteGeneratorFile,
  getGeneratorConfig,
  getGeneratorConfigPath,
  getGeneratorFile,
  getGeneratorFileTree,
  listGeneratorDirs,
  moveGeneratorFile,
  putGeneratorFile,
  updateGeneratorConfig,
  uploadGeneratorFile,
} from '@/api/routes/generator-configs';

const GENERATOR_CONFIG_DIRS_QUERY_KEY = ['generator-config-dirs'];

export function useGeneratorDirs() {
  return useQuery({
    queryKey: GENERATOR_CONFIG_DIRS_QUERY_KEY,
    queryFn: listGeneratorDirs,
  });
}

export function useGeneratorConfig(name: string) {
  return useQuery({
    queryKey: [...GENERATOR_CONFIG_DIRS_QUERY_KEY, name],
    queryFn: () => getGeneratorConfig(name),
  });
}

export function useCreateGeneratorConfigMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, config }: { name: string; config: GeneratorConfig }) =>
      createGeneratorConfig(name, config),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: GENERATOR_CONFIG_DIRS_QUERY_KEY,
        exact: true,
      });
    },
  });
}

export function useUpdateGeneratorConfigMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, config }: { name: string; config: GeneratorConfig }) =>
      updateGeneratorConfig(name, config),
    onSuccess: async (_, { name }) => {
      await queryClient.invalidateQueries({
        queryKey: [...GENERATOR_CONFIG_DIRS_QUERY_KEY, name],
        exact: true,
      });
    },
  });
}

export function useDeleteGeneratorConfigMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name }: { name: string }) => deleteGeneratorConfig(name),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: GENERATOR_CONFIG_DIRS_QUERY_KEY,
        exact: true,
      });
    },
  });
}

const GENERATOR_CONFIG_PATH_QUERY_KEY = ['generator-config-path'];

export function useGeneratorConfigPath(name: string) {
  return useQuery({
    queryKey: [...GENERATOR_CONFIG_PATH_QUERY_KEY, name],
    queryFn: () => getGeneratorConfigPath(name),
  });
}

const GENERATOR_CONFIG_DIR_FILES_QUERY_KEY = ['generator-config-dir-files'];

export function useGeneratorFileTree(name: string) {
  return useQuery({
    queryKey: [...GENERATOR_CONFIG_DIR_FILES_QUERY_KEY, name],
    queryFn: () => getGeneratorFileTree(name),
  });
}

export function useGeneratorFileContent(name: string, filepath: string) {
  return useQuery({
    queryKey: [...GENERATOR_CONFIG_DIR_FILES_QUERY_KEY, name, filepath],
    queryFn: () => getGeneratorFile(name, filepath),
  });
}

export function useUploadGeneratorFileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      name,
      filepath,
      content,
    }: {
      name: string;
      filepath: string;
      content: string;
    }) => uploadGeneratorFile(name, filepath, content),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: GENERATOR_CONFIG_DIR_FILES_QUERY_KEY,
        exact: true,
      });
    },
  });
}

export function usePutGeneratorFileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      name,
      filepath,
      content,
    }: {
      name: string;
      filepath: string;
      content: string;
    }) => putGeneratorFile(name, filepath, content),
    onSuccess: async (_, { name }) => {
      await queryClient.invalidateQueries({
        queryKey: [...GENERATOR_CONFIG_DIR_FILES_QUERY_KEY, name],
        exact: true,
      });
    },
  });
}

export function useDeleteGeneratorFileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, filepath }: { name: string; filepath: string }) =>
      deleteGeneratorFile(name, filepath),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: GENERATOR_CONFIG_DIR_FILES_QUERY_KEY,
        exact: true,
      });
    },
  });
}

export function useMoveGeneratorFileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      name,
      source,
      destination,
    }: {
      name: string;
      source: string;
      destination: string;
    }) => moveGeneratorFile(name, source, destination),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: GENERATOR_CONFIG_DIR_FILES_QUERY_KEY,
        exact: true,
      });
    },
  });
}

export function useCopyGeneratorFileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      name,
      source,
      destination,
    }: {
      name: string;
      source: string;
      destination: string;
    }) => copyGeneratorFile(name, source, destination),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: GENERATOR_CONFIG_DIR_FILES_QUERY_KEY,
        exact: true,
      });
    },
  });
}
