import z from 'zod';

import { BaseInputPluginConfigSchema } from '..';

export const TimePatternsInputPluginConfigSchema =
  BaseInputPluginConfigSchema.extend({
    patterns: z.array(z.string()).min(1),
  });
export type TimePatternsInputPluginConfig = z.infer<
  typeof TimePatternsInputPluginConfigSchema
>;
export const TimePatternsInputPluginNamedConfigSchema = z.object({
  time_patterns: TimePatternsInputPluginConfigSchema,
});
