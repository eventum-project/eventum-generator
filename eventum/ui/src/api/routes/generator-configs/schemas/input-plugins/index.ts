import z from 'zod';

export type InputPluginName =
  | 'cron'
  | 'http'
  | 'linspace'
  | 'static'
  | 'time_patterns'
  | 'timer'
  | 'timestamps';

const VersatileDatetimeStrictSchema = z.string();
const VersatileDatetimeSchema = VersatileDatetimeStrictSchema.nullable();

const BaseInputPluginConfigSchema = z.object({
  tags: z.array(z.string()).optional(),
});

/* Cron input plugin */
const CronInputPluginConfigSchema = BaseInputPluginConfigSchema.extend({
  start: VersatileDatetimeSchema.optional(),
  end: VersatileDatetimeSchema.optional(),
  expression: z.string(),
  count: z.number().int().gte(1),
});
export type CronInputPluginConfig = z.infer<typeof CronInputPluginConfigSchema>;
export const CronInputPluginNamedConfigSchema = z.object({
  cron: CronInputPluginConfigSchema,
});

/* HTTP input plugin */
const HTTPInputPluginConfigSchema = BaseInputPluginConfigSchema.extend({
  host: z.string().optional(),
  port: z.number().int().gte(1).lte(65_535),
  max_pending_requests: z.number().int().gte(1).optional(),
});
export type HTTPInputPluginConfig = z.infer<typeof HTTPInputPluginConfigSchema>;
export const HTTPInputPluginNamedConfigSchema = z.object({
  http: HTTPInputPluginConfigSchema,
});

/* Linspace input plugin */
const LinspaceInputPluginConfigSchema = BaseInputPluginConfigSchema.extend({
  start: VersatileDatetimeStrictSchema,
  end: VersatileDatetimeStrictSchema,
  count: z.number().int().gte(1),
  endpoint: z.boolean().optional(),
});
export type LinspaceInputPluginConfig = z.infer<
  typeof LinspaceInputPluginConfigSchema
>;
export const LinspaceInputPluginNamedConfigSchema = z.object({
  linspace: LinspaceInputPluginConfigSchema,
});

/* Static input plugin */
const StaticInputPluginConfigSchema = BaseInputPluginConfigSchema.extend({
  count: z.number().int().gte(1),
});
export type StaticInputPluginConfig = z.infer<
  typeof StaticInputPluginConfigSchema
>;
export const StaticInputPluginNamedConfigSchema = z.object({
  static: StaticInputPluginConfigSchema,
});

/* Time patterns input plugin */
const TimePatternsInputPluginConfigSchema = BaseInputPluginConfigSchema.extend({
  patterns: z.array(z.string()).min(1),
});
export type TimePatternsInputPluginConfig = z.infer<
  typeof TimePatternsInputPluginConfigSchema
>;
export const TimePatternsInputPluginNamedConfigSchema = z.object({
  time_patterns: TimePatternsInputPluginConfigSchema,
});

/* Timer input plugin */
const TimerInputPluginConfigSchema = BaseInputPluginConfigSchema.extend({
  start: VersatileDatetimeSchema.optional(),
  seconds: z.number().gte(0.1),
  count: z.number().int().gte(1),
  repeat: z.number().int().gte(0).nullable().optional(),
});
export type TimerInputPluginConfig = z.infer<
  typeof TimerInputPluginConfigSchema
>;
export const TimerInputPluginNamedConfigSchema = z.object({
  timer: TimerInputPluginConfigSchema,
});

/* Timestamps input plugin */
const TimestampsInputPluginConfigSchema = BaseInputPluginConfigSchema.extend({
  source: z.union([z.array(z.string()).min(1), z.string()]),
});
export type TimestampsInputPluginConfig = z.infer<
  typeof TimestampsInputPluginConfigSchema
>;
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
export type InputPluginNamedConfig = z.infer<
  typeof InputPluginNamedConfigSchema
>;

export const InputPluginConfigSchema = z.union([
  CronInputPluginConfigSchema,
  HTTPInputPluginConfigSchema,
  LinspaceInputPluginConfigSchema,
  StaticInputPluginConfigSchema,
  TimePatternsInputPluginConfigSchema,
  TimerInputPluginConfigSchema,
  TimestampsInputPluginConfigSchema,
]);
export type InputPluginConfig = z.infer<typeof InputPluginConfigSchema>;
