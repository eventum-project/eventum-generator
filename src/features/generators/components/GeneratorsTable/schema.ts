import { z } from 'zod';

import { GeneratorStatus } from './statuses';

export const generatorInfoSchema = z.object({
  id: z.string(),
  tags: z.array(z.string()),
  status: z.nativeEnum(GeneratorStatus),
  lastStarted: z.string().datetime({ offset: true }),
  created: z.string().datetime({ offset: true }),
});

export type GeneratorInfo = z.infer<typeof generatorInfoSchema>;
