import { LinspaceInputPluginConfig } from '@/api/routes/generator-configs/schemas/plugins/input/configs/linspace';

export const LinspaceInputPluginDefaultConfig: LinspaceInputPluginConfig = {
  start: 'now',
  end: '+30d',
  count: 30,
};
