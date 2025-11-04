import z from 'zod';

export const SecretValueSchema = z.string();
export type SecretValue = z.infer<typeof SecretValueSchema>;

export const SecretNamesSchema = z.array(z.string());
export type SecretNames = z.infer<typeof SecretNamesSchema>;
