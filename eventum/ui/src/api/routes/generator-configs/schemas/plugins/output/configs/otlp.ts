import z from 'zod';

import { orPlaceholder } from '../../../placeholder';
import { HttpUrlSchema } from '../../../url';
import { HTTPAuthConfigSchema } from '../auth';
import { BaseOutputPluginConfigSchema } from '../base-config';
import { Format } from '../formatters';

export const OTLP_PROTOCOLS = ['http/protobuf', 'http/json'];
export const OTLP_COMPRESSIONS = ['none', 'gzip'];

export const OtlpOutputPluginConfigSchema = BaseOutputPluginConfigSchema.extend(
  {
    endpoint: orPlaceholder(HttpUrlSchema),
    protocol: orPlaceholder(z.enum(OTLP_PROTOCOLS)).optional(),
    compression: orPlaceholder(z.enum(OTLP_COMPRESSIONS)).optional(),
    headers: z.record(z.string().min(1), z.string()).optional(),
    auth: HTTPAuthConfigSchema.nullable().optional(),
    connect_timeout: orPlaceholder(z.number().int().gte(1)).optional(),
    request_timeout: orPlaceholder(z.number().int().gte(1)).optional(),
    body_field: z.string().min(1).nullable().optional(),
    timestamp_field: z.string().min(1).nullable().optional(),
    severity_field: z.string().min(1).nullable().optional(),
    flatten_attributes: orPlaceholder(z.boolean()).optional(),
    resource_attributes: z
      .record(z.string().min(1), z.union([z.string(), z.number(), z.boolean()]))
      .optional(),
    resource_attributes_from: z
      .record(z.string().min(1), z.string().min(1))
      .optional(),
    max_request_bytes: orPlaceholder(z.number().int().gte(1024)).optional(),
    verify: orPlaceholder(z.boolean()).optional(),
    ca_cert: z.string().min(1).nullable().optional(),
    client_cert: z.string().min(1).nullable().optional(),
    client_cert_key: z.string().min(1).nullable().optional(),
    proxy_url: orPlaceholder(HttpUrlSchema).nullable().optional(),
  }
).superRefine((config, ctx) => {
  const format = config.formatter?.format;

  if (
    format === Format.JSONBatch ||
    format === Format.TemplateBatch ||
    format === Format.EventumHTTPInput
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['formatter', 'format'],
      message:
        'This formatter produces one string for the whole batch, but ' +
        'otlp maps every event to its own record. Choose a per-event ' +
        'formatter instead.',
    });
  }

  // the plugin sets the header itself, so the two cannot be combined
  if (config.auth === null || config.auth === undefined) {
    return;
  }

  const written = Object.keys(config.headers ?? {}).find(
    (header) => header.toLowerCase() === 'authorization'
  );

  if (written !== undefined) {
    ctx.addIssue({
      code: 'custom',
      path: ['headers'],
      message:
        'The Authorization header cannot be set together with auth; ' +
        'keep one of them',
    });
  }
});
export type OtlpOutputPluginConfig = z.infer<
  typeof OtlpOutputPluginConfigSchema
>;
export const OtlpOutputPluginNamedConfigSchema = z.object({
  otlp: OtlpOutputPluginConfigSchema,
});
