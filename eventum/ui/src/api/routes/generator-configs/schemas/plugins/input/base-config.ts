import z from 'zod';

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
