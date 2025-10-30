import { apiClient } from '@/api/client';
import {
  InstanceInfo,
  InstanceInfoSchema,
  Settings,
  SettingsSchema,
} from '@/api/routes/instance/schemas';
import { validateResponse } from '@/api/wrappers';

export async function getInstanceInfo(): Promise<InstanceInfo> {
  return await validateResponse(
    InstanceInfoSchema,
    apiClient.get('/instance/info')
  );
}

export async function getInstanceSettings(): Promise<Settings> {
  return await validateResponse(
    SettingsSchema,
    apiClient.get('/instance/settings')
  );
}

export async function updateInstanceSettings(
  settings: Settings
): Promise<undefined> {
  await apiClient.put('/instance/settings', settings);
}

export async function stopInstance(): Promise<undefined> {
  await apiClient.post('/instance/stop');
}

export async function restartInstance(): Promise<undefined> {
  await apiClient.post('/instance/restart');
}
