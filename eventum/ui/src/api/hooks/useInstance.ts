import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getInstanceInfo,
  getInstanceSettings,
  restartInstance,
  stopInstance,
  updateInstanceSettings,
} from '@/api/routes/instance';
import { Settings } from '@/api/routes/instance/schemas';

const INSTANCE_SETTINGS_QUERY_KEY = ['instance', 'settings'];
const INSTANCE_INFO_QUERY_KEY = ['instance', 'info'];

export function useInstanceInfo() {
  return useQuery({
    queryKey: INSTANCE_INFO_QUERY_KEY,
    queryFn: getInstanceInfo,
  });
}

export function useInstanceSettings() {
  return useQuery({
    queryKey: INSTANCE_SETTINGS_QUERY_KEY,
    queryFn: getInstanceSettings,
  });
}

export function useUpdateInstanceSettingsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ settings }: { settings: Settings }) =>
      updateInstanceSettings(settings),
    onSuccess: (data) => {
      queryClient.setQueryData(INSTANCE_SETTINGS_QUERY_KEY, data);
    },
  });
}

export function useStopInstanceMutation() {
  return useMutation({
    mutationFn: stopInstance,
  });
}

export function useRestartInstanceMutation() {
  return useMutation({
    mutationFn: restartInstance,
  });
}
