import { z } from 'zod';

import { EventPluginNamedConfigSchema } from './event-plugins';
import { InputPluginNamedConfigSchema } from './input-plugins';
import { OutputPluginNamedConfigSchema } from './output-plugins';

export const GeneratorDirsExtendedInfoSchema = z.array(
  z.object({
    name: z.string(),
    size_in_bytes: z.number().int().nullable(),
    last_modified: z.number().nullable(),
    generator_ids: z.array(z.string()),
  })
);

export type GeneratorDirsExtendedInfo = z.infer<
  typeof GeneratorDirsExtendedInfoSchema
>;

export const GeneratorConfigSchema = z.object({
  input: z.array(InputPluginNamedConfigSchema).min(1),
  event: EventPluginNamedConfigSchema,
  output: z.array(OutputPluginNamedConfigSchema).min(1),
});
export type GeneratorConfig = z.infer<typeof GeneratorConfigSchema>;

export const GeneratorConfigPathSchema = z.string();
export type GeneratorConfigPath = z.infer<typeof GeneratorConfigPathSchema>;

const FileNodeSchema: z.ZodType = z.lazy(() =>
  z.object({
    name: z.string(),
    is_dir: z.boolean(),
    children: z.union([z.array(FileNodeSchema), z.null()]).optional(),
  })
);
export const FileNodesListSchema = z.array(FileNodeSchema);
export type FileNodesList = z.infer<typeof FileNodesListSchema>;

export const GeneratorFileContentSchema = z.string();
export type GeneratorFileContent = z.infer<typeof GeneratorFileContentSchema>;
