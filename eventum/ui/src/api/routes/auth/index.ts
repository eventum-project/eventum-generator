import { apiClient } from '@/api/client';
import { Username, usernameSchema } from '@/api/routes/auth/schemas';

export async function getCurrentUser(): Promise<Username> {
  const res = await apiClient.get('/auth/me');
  return usernameSchema.parse(res.data);
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
