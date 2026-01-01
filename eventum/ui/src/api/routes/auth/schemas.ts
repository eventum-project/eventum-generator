import { z } from 'zod';

export const usernameSchema = z.string();

export type Username = z.infer<typeof usernameSchema>;
