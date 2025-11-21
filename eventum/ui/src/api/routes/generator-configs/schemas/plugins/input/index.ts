import z from 'zod';

import {
  CronInputPluginConfigSchema,
  CronInputPluginNamedConfigSchema,
} from './configs/cron';
import {
  HTTPInputPluginConfigSchema,
  HTTPInputPluginNamedConfigSchema,
} from './configs/http';
import {
  LinspaceInputPluginConfigSchema,
  LinspaceInputPluginNamedConfigSchema,
} from './configs/linspace';
import {
  StaticInputPluginConfigSchema,
  StaticInputPluginNamedConfigSchema,
} from './configs/static';
import {
  TimePatternsInputPluginConfigSchema,
  TimePatternsInputPluginNamedConfigSchema,
} from './configs/time_patterns';
import {
  TimerInputPluginConfigSchema,
  TimerInputPluginNamedConfigSchema,
} from './configs/timer';
import {
  TimestampsInputPluginConfigSchema,
  TimestampsInputPluginNamedConfigSchema,
} from './configs/timestamps';

export const BaseInputPluginConfigSchema = z.object({
  tags: z.array(z.string()).optional(),
});

export type InputPluginName =
  | 'cron'
  | 'http'
  | 'linspace'
  | 'static'
  | 'time_patterns'
  | 'timer'
  | 'timestamps';

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
