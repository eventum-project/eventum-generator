import z from 'zod';

import { BaseInputPluginConfigSchema } from '../base-config';

export const TimestampsInputPluginConfigSchema =
  BaseInputPluginConfigSchema.extend({
    source: z.union([z.array(z.string()).min(1), z.string()]),
  });
export type TimestampsInputPluginConfig = z.infer<
  typeof TimestampsInputPluginConfigSchema
>;
export const TimestampsInputPluginNamedConfigSchema = z.object({
  timestamps: TimestampsInputPluginConfigSchema,
});
