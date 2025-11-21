import z from 'zod';

import { BaseInputPluginConfigSchema } from '..';
import { VersatileDatetimeStrictSchema } from '../versatile-datetime';

export const LinspaceInputPluginConfigSchema =
  BaseInputPluginConfigSchema.extend({
    start: VersatileDatetimeStrictSchema,
    end: VersatileDatetimeStrictSchema,
    count: z.number().int().gte(1),
    endpoint: z.boolean().optional(),
  });
export type LinspaceInputPluginConfig = z.infer<
  typeof LinspaceInputPluginConfigSchema
>;
export const LinspaceInputPluginNamedConfigSchema = z.object({
  linspace: LinspaceInputPluginConfigSchema,
});
