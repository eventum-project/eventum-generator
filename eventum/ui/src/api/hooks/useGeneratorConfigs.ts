import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  deleteGeneratorConfig,
  listGeneratorDirs,
} from '@/api/routes/generator-configs';

const GENERATOR_DIRS_QUERY_KEY = ['generator-configs'];

export function useGeneratorDirs() {
  return useQuery({
    queryKey: GENERATOR_DIRS_QUERY_KEY,
    queryFn: listGeneratorDirs,
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
