import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { GeneratorConfig } from '../routes/generator-configs/schemas';
import {
  createGeneratorConfig,
  deleteGeneratorConfig,
  getGeneratorConfig,
  listGeneratorDirs,
  updateGeneratorConfig,
} from '@/api/routes/generator-configs';

const GENERATOR_DIRS_QUERY_KEY = ['generator-configs'];

export function useGeneratorDirs() {
  return useQuery({
    queryKey: GENERATOR_DIRS_QUERY_KEY,
    queryFn: listGeneratorDirs,
  });
}

export function useGeneratorConfig(name: string) {
  return useQuery({
    queryKey: [...GENERATOR_DIRS_QUERY_KEY, name],
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
        queryKey: GENERATOR_DIRS_QUERY_KEY,
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
        queryKey: [...GENERATOR_DIRS_QUERY_KEY, name],
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
        queryKey: GENERATOR_DIRS_QUERY_KEY,
        exact: true,
      });
    },
  });
}
