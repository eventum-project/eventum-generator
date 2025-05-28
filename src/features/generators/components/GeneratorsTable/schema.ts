import { z } from 'zod';

import { GeneratorStatus } from './statuses';

const tagSchema = z.object({
  name: z.string(),
  color: z.string(),
});

export const generatorInfoSchema = z.object({
  id: z.string(),
  tags: z.array(tagSchema),
  status: z.nativeEnum(GeneratorStatus),
  lastStarted: z.string().datetime({ offset: true }).optional(),
  created: z.string().datetime({ offset: true }),
  startupEnabled: z.boolean(),
});

export type GeneratorInfo = z.infer<typeof generatorInfoSchema>;
export type Tag = z.infer<typeof tagSchema>;
