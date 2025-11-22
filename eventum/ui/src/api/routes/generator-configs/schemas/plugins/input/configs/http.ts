import z from 'zod';

import { BaseInputPluginConfigSchema } from '../base-config';

export const HTTPInputPluginConfigSchema = BaseInputPluginConfigSchema.extend({
  host: z.string().optional(),
  port: z.number().int().gte(1).lte(65_535),
  max_pending_requests: z.number().int().gte(1).optional(),
});
export type HTTPInputPluginConfig = z.infer<typeof HTTPInputPluginConfigSchema>;
export const HTTPInputPluginNamedConfigSchema = z.object({
  http: HTTPInputPluginConfigSchema,
});
