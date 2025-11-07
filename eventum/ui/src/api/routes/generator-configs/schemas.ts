import { z } from 'zod';

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
