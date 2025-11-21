import z from 'zod';

import { BaseEventPluginConfigSchema } from '..';
import { ENCODINGS } from '../../../encodings';

export const ReplayEventPluginConfigSchema = BaseEventPluginConfigSchema.extend(
  {
    path: z.string().min(1),
    timestamp_pattern: z.string().min(1).nullable().optional(),
    timestamp_format: z.string().min(1).nullable().optional(),
    repeat: z.boolean().optional(),
    chunk_size: z.number().int().gte(0).optional(),
    encoding: z.enum(ENCODINGS).optional(),
  }
);
export type ReplayEventPluginConfig = z.infer<
  typeof ReplayEventPluginConfigSchema
>;
export const ReplayEventPluginNamedConfigSchema = z.object({
  replay: ReplayEventPluginConfigSchema,
});
