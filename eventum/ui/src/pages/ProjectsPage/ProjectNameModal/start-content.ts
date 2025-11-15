import {
  EventPluginNamedConfig,
  TemplatePickingMode,
} from '@/api/routes/generator-configs/schemas/event-plugins';
import { InputPluginNamedConfig } from '@/api/routes/generator-configs/schemas/input-plugins';
import { OutputPluginNamedConfig } from '@/api/routes/generator-configs/schemas/output-plugins';

export type EventPluginName = 'template' | 'replay' | 'script';

export function getEventPluginDefaultConfig(
  pluginName: EventPluginName
): EventPluginNamedConfig {
  if (pluginName === 'template') {
    return {
      template: {
        mode: TemplatePickingMode.All,
        templates: [
          {
            template: {
              template: 'templates/template.jinja',
            },
          },
        ],
      },
    };
  } else if (pluginName === 'replay') {
    return {
      replay: {
        path: 'static/example.log',
      },
    };
  } else {
    return {
      script: {
        path: 'scripts/produce.py',
      },
    };
  }
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
