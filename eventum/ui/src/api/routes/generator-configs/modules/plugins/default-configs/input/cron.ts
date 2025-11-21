import { CronInputPluginConfig } from '@/api/routes/generator-configs/schemas/plugins/input/configs/cron';

export const CronInputPluginDefaultConfig: CronInputPluginConfig = {
  expression: '* * * * *',
  count: 1,
};
