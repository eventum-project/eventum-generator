import z from 'zod';

import { BaseInputPluginConfigSchema } from '..';

export const StaticInputPluginConfigSchema = BaseInputPluginConfigSchema.extend(
  {
    count: z.number().int().gte(1),
  }
);
export type StaticInputPluginConfig = z.infer<
  typeof StaticInputPluginConfigSchema
>;
export const StaticInputPluginNamedConfigSchema = z.object({
  static: StaticInputPluginConfigSchema,
});
