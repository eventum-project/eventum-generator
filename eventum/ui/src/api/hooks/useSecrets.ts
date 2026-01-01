import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  deleteSecretValue,
  getSecretNames,
  getSecretValue,
  setSecretValue,
} from '@/api/routes/secrets';

const SECRETS_QUERY_KEY = ['secrets'];

export function useSecretValue(name: string) {
  return useQuery({
    queryKey: [...SECRETS_QUERY_KEY, name],
    queryFn: () => getSecretValue(name),
    enabled: false,
  });
}

export function useSecretNames() {
  return useQuery({
    queryKey: SECRETS_QUERY_KEY,
    queryFn: getSecretNames,
  });
}

export function useSetSecretValueMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, value }: { name: string; value: string }) =>
      setSecretValue(name, value),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: SECRETS_QUERY_KEY,
        exact: true,
      });
    },
  });
}

export function useDeleteSecretValueMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name }: { name: string }) => deleteSecretValue(name),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: SECRETS_QUERY_KEY,
        exact: true,
      });
    },
  });
}
