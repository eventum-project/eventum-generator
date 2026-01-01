import z from 'zod';

import {
  ClickhouseOutputPluginConfigSchema,
  ClickhouseOutputPluginNamedConfigSchema,
} from './configs/clickhouse';
import {
  FileOutputPluginConfigSchema,
  FileOutputPluginNamedConfigSchema,
} from './configs/file';
import {
  HTTPOutputPluginConfigSchema,
  HTTPOutputPluginNamedConfigSchema,
} from './configs/http';
import {
  OpensearchOutputPluginConfigSchema,
  OpensearchOutputPluginNamedConfigSchema,
} from './configs/opensearch';
import {
  StdoutOutputPluginConfigSchema,
  StdoutOutputPluginNamedConfigSchema,
} from './configs/stdout';

export const OutputPluginNamedConfigSchema = z.union([
  ClickhouseOutputPluginNamedConfigSchema,
  FileOutputPluginNamedConfigSchema,
  HTTPOutputPluginNamedConfigSchema,
  OpensearchOutputPluginNamedConfigSchema,
  StdoutOutputPluginNamedConfigSchema,
]);
export type OutputPluginNamedConfig = z.infer<
  typeof OutputPluginNamedConfigSchema
>;

export const OutputPluginConfigSchema = z.union([
  ClickhouseOutputPluginConfigSchema,
  FileOutputPluginConfigSchema,
  HTTPOutputPluginConfigSchema,
  OpensearchOutputPluginConfigSchema,
  StdoutOutputPluginConfigSchema,
]);
export type OutputPluginConfig = z.infer<typeof OutputPluginConfigSchema>;
