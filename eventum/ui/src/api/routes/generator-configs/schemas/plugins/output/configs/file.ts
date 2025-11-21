import z from 'zod';

import { BaseOutputPluginConfigSchema } from '..';
import { ENCODINGS } from '../../../encodings';

export const FileOutputPluginConfigSchema = BaseOutputPluginConfigSchema.extend(
  {
    path: z.string().min(1),
    flush_interval: z.number().gte(0).optional(),
    cleanup_interval: z.number().gte(1).optional(),
    file_mode: z.number().int().gte(0).lte(7777).optional(),
    write_mode: z.enum(['append', 'overwrite']).optional(),
    encoding: z.enum(ENCODINGS).optional(),
    separator: z.string().optional(),
  }
);
export type FileOutputPluginConfig = z.infer<
  typeof FileOutputPluginConfigSchema
>;
export const FileOutputPluginNamedConfigSchema = z.object({
  file: FileOutputPluginConfigSchema,
});
