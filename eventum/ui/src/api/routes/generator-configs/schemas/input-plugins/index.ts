import z from 'zod';

const VersatileDatetimeStrictSchema = z.string();
const VersatileDatetimeSchema = VersatileDatetimeStrictSchema.nullable();

const InputPluginConfigSchema = z.object({
  tags: z.array(z.string()).optional(),
});

/* Cron input plugin */
const CronInputPluginConfigSchema = InputPluginConfigSchema.extend({
  start: VersatileDatetimeSchema.optional(),
  end: VersatileDatetimeSchema.optional(),
  expression: z.string(),
  count: z.number().int().gte(1),
});

export const CronInputPluginNamedConfigSchema = z.object({
  cron: CronInputPluginConfigSchema,
});

/* HTTP input plugin */
const HTTPInputPluginConfigSchema = InputPluginConfigSchema.extend({
  host: z.string().optional(),
  port: z.number().int().gte(1).lte(65_535),
  max_pending_requests: z.number().int().gte(1).optional(),
});

export const HTTPInputPluginNamedConfigSchema = z.object({
  http: HTTPInputPluginConfigSchema,
});

/* Linspace input plugin */
const LinspaceInputPluginConfigSchema = InputPluginConfigSchema.extend({
  start: VersatileDatetimeStrictSchema,
  end: VersatileDatetimeStrictSchema,
  count: z.number().int().gte(1),
  endpoint: z.boolean().optional(),
});

export const LinspaceInputPluginNamedConfigSchema = z.object({
  linspace: LinspaceInputPluginConfigSchema,
});

/* Static input plugin */
const StaticInputPluginConfigSchema = InputPluginConfigSchema.extend({
  count: z.number().int().gte(1),
});

export const StaticInputPluginNamedConfigSchema = z.object({
  static: StaticInputPluginConfigSchema,
});

/* Time patterns input plugin */
const TimePatternsInputPluginConfigSchema = InputPluginConfigSchema.extend({
  patterns: z.array(z.string()).min(1),
});

export const TimePatternsInputPluginNamedConfigSchema = z.object({
  time_patterns: TimePatternsInputPluginConfigSchema,
});

/* Timer input plugin */
const TimerInputPluginConfigSchema = InputPluginConfigSchema.extend({
  start: VersatileDatetimeSchema.optional(),
  seconds: z.number().gte(0.1),
  count: z.number().int().gte(1),
  repeat: z.number().int().gte(0).nullable().optional(),
});

export const TimerInputPluginNamedConfigSchema = z.object({
  timer: TimerInputPluginConfigSchema,
});

/* Timestamps input plugin */
const TimestampsInputPluginConfigSchema = InputPluginConfigSchema.extend({
  source: z.union([z.array(z.string()).min(1), z.string()]),
});

export const TimestampsInputPluginNamedConfigSchema = z.object({
  timestamps: TimestampsInputPluginConfigSchema,
});

export const InputPluginNamedConfigSchema = z.union([
  CronInputPluginNamedConfigSchema,
  HTTPInputPluginNamedConfigSchema,
  LinspaceInputPluginNamedConfigSchema,
  StaticInputPluginNamedConfigSchema,
  TimePatternsInputPluginNamedConfigSchema,
  TimerInputPluginNamedConfigSchema,
  TimestampsInputPluginNamedConfigSchema,
]);
