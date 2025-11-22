import z from 'zod';

import { FormatterConfigSchema } from './formatters';

export type OutputPluginName =
  | 'clickhouse'
  | 'file'
  | 'http'
  | 'opensearch'
  | 'stdout';

export const BaseOutputPluginConfigSchema = z.object({
  formatter: FormatterConfigSchema.optional(),
});
