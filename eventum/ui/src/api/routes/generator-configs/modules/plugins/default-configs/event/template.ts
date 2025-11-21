import {
  TemplateEventPluginConfig,
  TemplatePickingMode,
} from '@/api/routes/generator-configs/schemas/plugins/event/configs/template';

export const TemplateEventPluginDefaultConfig: TemplateEventPluginConfig = {
  mode: TemplatePickingMode.All,
  templates: [
    {
      template: { template: './templates/template.jinja' },
    },
  ],
};
