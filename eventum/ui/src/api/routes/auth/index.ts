import { apiClient } from '@/api/client';
import { Username, usernameSchema } from '@/api/routes/auth/schemas';
import { validateResponse } from '@/api/wrappers';

export async function getCurrentUser(): Promise<Username> {
  return await validateResponse(usernameSchema, apiClient.get('/auth/me'));
}

export async function login(
  username: string,
  password: string
): Promise<Username> {
  const res = await apiClient.post('/auth/login', null, {
    auth: { username: username, password: password },
  });

  return usernameSchema.parse(res.data);
}

export async function logout(): Promise<undefined> {
  await apiClient.post('/auth/logout');
}
