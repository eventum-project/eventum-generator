import z from 'zod';

import { BaseInputPluginConfigSchema } from '..';
import { VersatileDatetimeSchema } from '../versatile-datetime';

export const CronInputPluginConfigSchema = BaseInputPluginConfigSchema.extend({
  start: VersatileDatetimeSchema.optional(),
  end: VersatileDatetimeSchema.optional(),
  expression: z.string(),
  count: z.number().int().gte(1),
});
export type CronInputPluginConfig = z.infer<typeof CronInputPluginConfigSchema>;
export const CronInputPluginNamedConfigSchema = z.object({
  cron: CronInputPluginConfigSchema,
});
