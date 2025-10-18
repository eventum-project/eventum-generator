import { z } from 'zod';

export const InstanceInfoSchema = z.object({
  app_version: z.string(),
  python_version: z.string(),
  python_implementation: z.string(),
  python_compiler: z.string(),
  platform: z.string(),
  host_name: z.string(),
  host_ip_v4: z.string(),
  boot_timestamp: z.number(),
  cpu_count: z.number().nullable(),
  cpu_frequency_mhz: z.number(),
  cpu_percent: z.number(),
  memory_total_bytes: z.number().int(),
  memory_used_bytes: z.number().int(),
  memory_available_bytes: z.number().int(),
  network_sent_bytes: z.number().int(),
  network_received_bytes: z.number().int(),
  disk_written_bytes: z.number().int(),
  disk_read_bytes: z.number().int(),
  uptime: z.number(),
});

export type InstanceInfo = z.infer<typeof InstanceInfoSchema>;

export const SSLParametersSchema = z.object({
  enabled: z.boolean(),
  ca_cert: z.string().nullable(),
  cert: z.string().nullable(),
  cert_key: z.string().nullable(),
});

export const AuthParametersSchema = z.object({
  user: z.string().min(1),
  password: z.string().min(1),
});

export const APIParametersSchema = z.object({
  enabled: z.boolean(),
  host: z.string().min(1),
  port: z.number().int().gte(1),
  ssl: SSLParametersSchema,
  auth: AuthParametersSchema,
});

export const BatchParametersSchema = z.object({
  size: z.number(),
  delay: z.number(),
});

const QueueParametersSchema = z.object({
  max_timestamp_batches: z.number().int().gte(1),
  max_event_batches: z.number().int().gte(1),
});

export const GenerationParametersSchema = z.object({
  timezone: z.string().min(3),
  batch: BatchParametersSchema,
  queue: QueueParametersSchema,
  keep_order: z.boolean(),
  max_concurrency: z.number().int(),
  write_timeout: z.number().int().gte(1),
});

export const LogParametersSchema = z.object({
  level: z.enum(['debug', 'info', 'warning', 'error', 'critical']),
  format: z.enum(['plain', 'json']),
  max_bytes: z.number().int().gte(1024),
  backups: z.number().int().gte(1),
});

export const PathParametersSchema = z.object({
  logs: z.string().min(1),
  startup: z.string().min(1),
  generators_dir: z.string().min(1),
  keyring_cryptfile: z.string().min(1),
  generator_config_filename: z.string().min(1),
});

export const SettingsSchema = z.object({
  api: APIParametersSchema,
  generation: GenerationParametersSchema,
  log: LogParametersSchema,
  path: PathParametersSchema,
});

export type Settings = z.infer<typeof SettingsSchema>;
