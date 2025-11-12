import { z } from 'zod';

import { ENCODINGS } from '../encodings';
import { CLICKHOUSE_INPUT_FORMAT } from './clickhouse-input-formats';
import { FormatterConfigSchema } from './formatters';

const EventPluginConfigSchema = z.object({
  formatter: FormatterConfigSchema.optional(),
});

const ClickhouseOutputPluginConfigSchema = EventPluginConfigSchema.extend({
  host: z.string().min(1),
  port: z.number().int().gte(1).lte(65_535).optional(),
  protocol: z.enum(['http', 'https']).optional(),
  database: z.string().min(1).optional(),
  table: z.string().min(1),
  username: z.string().min(1).optional(),
  password: z.string().optional(),
  dsn: z.string().min(1).nullable().optional(),
  connect_timeout: z.number().int().gte(1).optional(),
  request_timeout: z.number().int().gte(1).optional(),
  client_name: z.string().min(1).nullable().optional(),
  verify: z.boolean().optional(),
  ca_cert: z.string().min(1).nullable().optional(),
  client_cert: z.string().min(1).nullable().optional(),
  client_cert_key: z.string().min(1).nullable().optional(),
  server_host_name: z.string().min(1).nullable().optional(),
  tls_mode: z.enum(['proxy', 'strict', 'mutual']).nullable().optional(),
  proxy_url: z.string().min(1).nullable().optional(),
  input_format: z.enum(CLICKHOUSE_INPUT_FORMAT).optional(),
  header: z.string().optional(),
  footer: z.string().optional(),
  separator: z.string().optional(),
});

export const ClickhouseOutputPluginNamedConfigSchema = z.object({
  clickhouse: ClickhouseOutputPluginConfigSchema,
});

const FileOutputPluginConfigSchema = EventPluginConfigSchema.extend({
  path: z.string().min(1),
  flush_interval: z.number().gte(0).optional(),
  cleanup_interval: z.number().gte(1).optional(),
  file_mode: z.number().int().gte(0).lte(7777).optional(),
  write_mode: z.enum(['append', 'overwrite']).optional(),
  encoding: z.enum(ENCODINGS).optional(),
  separator: z.string().optional(),
});

export const FileOutputPluginNamedConfigSchema = z.object({
  file: FileOutputPluginConfigSchema,
});

const HTTPOutputPluginConfigSchema = EventPluginConfigSchema.extend({
  url: z.httpUrl(),
  method: z
    .enum(['GET', 'HEAD', 'OPTIONS', 'POST', 'PUT', 'PATCH', 'DELETE'])
    .optional(),
  success_code: z.number().int().gte(100).lt(600).optional(),
  headers: z.record(z.string().min(1), z.any()).optional(),
  username: z.string().min(1).nullable().optional(),
  password: z.string().min(1).nullable().optional(),
  connect_timeout: z.number().int().gte(1).optional(),
  request_timeout: z.number().int().gte(1).optional(),
  verify: z.boolean().optional(),
  ca_cert: z.string().min(1).nullable().optional(),
  client_cert: z.string().min(1).nullable().optional(),
  client_cert_key: z.string().min(1).nullable().optional(),
  proxy_url: z.httpUrl().nullable().optional(),
});

export const HttpOutputPluginNamedConfigSchema = z.object({
  http: HTTPOutputPluginConfigSchema,
});

const OpensearchOutputPluginConfigSchema = EventPluginConfigSchema.extend({
  hosts: z.array(z.httpUrl()).min(1),
  username: z.string().min(1),
  password: z.string().min(1),
  index: z.string().min(1),
  connect_timeout: z.number().int().gte(1).optional(),
  request_timeout: z.number().int().gte(1).optional(),
  verify: z.boolean().optional(),
  ca_cert: z.string().min(1).nullable().optional(),
  client_cert: z.string().min(1).nullable().optional(),
  client_cert_key: z.string().min(1).nullable().optional(),
  proxy_url: z.httpUrl().nullable().optional(),
});

export const OpensearchOutputPluginNamedConfigSchema = z.object({
  opensearch: OpensearchOutputPluginConfigSchema,
});

const StdoutOutputPluginConfigSchema = EventPluginConfigSchema.extend({
  flush_interval: z.number().gte(0).optional(),
  stream: z.enum(['stdout', 'stderr']).optional(),
  encoding: z.enum(ENCODINGS).optional(),
  separator: z.string().optional(),
});

export const StdoutOutputPluginNamedConfigSchema = z.object({
  stdout: StdoutOutputPluginConfigSchema,
});

export const OutputPluginNamedConfigSchema = z.union([
  ClickhouseOutputPluginNamedConfigSchema,
  FileOutputPluginNamedConfigSchema,
  HttpOutputPluginNamedConfigSchema,
  OpensearchOutputPluginNamedConfigSchema,
  StdoutOutputPluginNamedConfigSchema,
]);

export type OutputPluginNamedConfig = z.infer<
  typeof OutputPluginNamedConfigSchema
>;
