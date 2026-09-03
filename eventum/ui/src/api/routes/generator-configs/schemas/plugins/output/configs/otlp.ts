import z from 'zod';

import { orPlaceholder } from '../../../placeholder';
import { BaseOutputPluginConfigSchema } from '../base-config';

export const OTLP_PROTOCOLS = ['http/protobuf', 'http/json'];
export const OTLP_COMPRESSIONS = ['none', 'gzip'];

export const OtlpOutputPluginConfigSchema = BaseOutputPluginConfigSchema.extend(
  {
    endpoint: orPlaceholder(z.httpUrl()),
    protocol: orPlaceholder(z.enum(OTLP_PROTOCOLS)).optional(),
    compression: orPlaceholder(z.enum(OTLP_COMPRESSIONS)).optional(),
    headers: z.record(z.string().min(1), z.string()).optional(),
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
    proxy_url: orPlaceholder(z.httpUrl()).nullable().optional(),
  }
);
export type OtlpOutputPluginConfig = z.infer<
  typeof OtlpOutputPluginConfigSchema
>;
export const OtlpOutputPluginNamedConfigSchema = z.object({
  otlp: OtlpOutputPluginConfigSchema,
});
