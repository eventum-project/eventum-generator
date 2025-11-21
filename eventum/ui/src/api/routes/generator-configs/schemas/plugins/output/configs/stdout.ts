import z from 'zod';

import { BaseOutputPluginConfigSchema } from '..';
import { ENCODINGS } from '../../../encodings';

export const StdoutOutputPluginConfigSchema =
  BaseOutputPluginConfigSchema.extend({
    flush_interval: z.number().gte(0).optional(),
    stream: z.enum(['stdout', 'stderr']).optional(),
    encoding: z.enum(ENCODINGS).optional(),
    separator: z.string().optional(),
  });
export type StdoutOutputPluginConfig = z.infer<
  typeof StdoutOutputPluginConfigSchema
>;
export const StdoutOutputPluginNamedConfigSchema = z.object({
  stdout: StdoutOutputPluginConfigSchema,
});
