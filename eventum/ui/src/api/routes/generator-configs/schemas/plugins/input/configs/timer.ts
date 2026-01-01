import z from 'zod';

import { BaseInputPluginConfigSchema } from '../base-config';
import { VersatileDatetimeSchema } from '../versatile-datetime';

export const TimerInputPluginConfigSchema = BaseInputPluginConfigSchema.extend({
  start: VersatileDatetimeSchema.optional(),
  seconds: z.number().gte(0.1),
  count: z.number().int().gte(1),
  repeat: z.number().int().gte(1).nullable().optional(),
});
export type TimerInputPluginConfig = z.infer<
  typeof TimerInputPluginConfigSchema
>;
export const TimerInputPluginNamedConfigSchema = z.object({
  timer: TimerInputPluginConfigSchema,
});
