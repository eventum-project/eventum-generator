import { apiClient } from '@/api/client';
import {
  InstanceInfo,
  InstanceInfoSchema,
  Settings,
  SettingsSchema,
} from '@/api/routes/instance/schemas';

export async function getInstanceInfo(): Promise<InstanceInfo> {
  const res = await apiClient.get('/instance/info');
  return InstanceInfoSchema.parse(res.data);
}

export async function getInstanceSettings(): Promise<Settings> {
  const res = await apiClient.get('/instance/info');
  return SettingsSchema.parse(res.data);
}

export async function updateInstanceSettings(
  settings: Settings
): Promise<undefined> {
  await apiClient.put('/instance/info', settings);
}

export async function stopInstance(): Promise<undefined> {
  await apiClient.post('/instance/stop');
}

export async function restartInstance(): Promise<undefined> {
  await apiClient.post('/instance/restart');
}
