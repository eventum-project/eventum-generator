import z from 'zod';

import { BaseEventPluginConfigSchema } from '../base-config';

export const ScriptEventPluginConfigSchema = BaseEventPluginConfigSchema.extend(
  {
    path: z.string().min(1),
  }
);
export type ScriptEventPluginConfig = z.infer<
  typeof ScriptEventPluginConfigSchema
>;
export const ScriptEventPluginNamedConfigSchema = z.object({
  script: ScriptEventPluginConfigSchema,
});
