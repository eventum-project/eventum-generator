import {
  EventPluginName,
  EventPluginNamedConfig,
  TemplatePickingMode,
} from '@/api/routes/generator-configs/schemas/event-plugins';
import { InputPluginNamedConfig } from '@/api/routes/generator-configs/schemas/input-plugins';
import { OutputPluginNamedConfig } from '@/api/routes/generator-configs/schemas/output-plugins';

const eventPluginDefaultConfigs: Record<
  EventPluginName,
  EventPluginNamedConfig
> = {
  template: {
    template: {
      mode: TemplatePickingMode.All,
      templates: [
        {
          template: { template: 'templates/template.jinja' },
        },
      ],
    },
  },
  replay: {
    replay: { path: 'static/example.log' },
  },
  script: {
    script: { path: 'scripts/produce.py' },
  },
};

export function getEventPluginDefaultConfig(
  pluginName: EventPluginName
): EventPluginNamedConfig {
  return eventPluginDefaultConfigs[pluginName];
}

export function getDefaultInputPluginDefaultConfig(): InputPluginNamedConfig {
  return {
    timer: {
      seconds: 5,
      count: 1,
    },
  };
}

export function getDefaultOutputPluginDefaultConfig(): OutputPluginNamedConfig {
  return {
    stdout: {},
  };
}

export function getEventPluginAsset(pluginName: EventPluginName): {
  path: string;
  content: string;
} {
  if (pluginName === 'template') {
    return {
      path: 'templates/template.jinja',
      content: 'Template content',
    };
  } else if (pluginName === 'replay') {
    return {
      path: 'static/example.log',
      content: 'Event 1\nEvent 2\nEvent 3\n',
    };
  } else {
    return {
      path: 'scripts/produce.py',
      content: 'def produce(params: dict) -> str | list[str]:\n    ...\n',
    };
  }
}
