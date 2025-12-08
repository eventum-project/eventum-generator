import { CodeHighlight } from '@mantine/code-highlight';
import { Stack, Text } from '@mantine/core';
import { FC } from 'react';
import YAML from 'yaml';

import { TemplateEventPluginParams } from './TemplateEventPluginParams';
import {
  EventPluginConfig,
  EventPluginNamedConfig,
} from '@/api/routes/generator-configs/schemas/plugins/event';
import { EventPluginName } from '@/api/routes/generator-configs/schemas/plugins/event/base-config';

interface EventPluginParamsProps {
  eventPluginConfig: EventPluginNamedConfig;
  onChange: (eventPluginConfig: EventPluginNamedConfig) => void;
}

type PluginNameToConfigType = {
  [K in EventPluginName]: Extract<
    EventPluginNamedConfig,
    Record<K, unknown>
  >[K];
};

const pluginNamesToParamsComponent = {
  template: TemplateEventPluginParams,
  replay: '',
  script: '',
} as const satisfies {
  [K in EventPluginName]: FC<{
    initialConfig: PluginNameToConfigType[K];
    onChange: (config: PluginNameToConfigType[K]) => unknown;
  }>;
};

type UnionToIntersection<U> = (
  U extends unknown ? (x: U) => void : never
) extends (x: infer I) => void
  ? I
  : never;

export const EventPluginParams: FC<EventPluginParamsProps> = ({
  eventPluginConfig,
  onChange,
}) => {
  const [pluginName, pluginConfig] = Object.entries(eventPluginConfig)[0] as [
    EventPluginName,
    UnionToIntersection<EventPluginConfig>,
  ];

  const ParamsComponent = pluginNamesToParamsComponent[pluginName];

  return (
    <Stack>
      <ParamsComponent
        initialConfig={pluginConfig}
        onChange={(newConfig) => {
          onChange({ [pluginName]: newConfig } as EventPluginNamedConfig);
        }}
      />
      <Stack gap="4px">
        <Text size="sm" fw="bold">
          Configuration preview
        </Text>
        <CodeHighlight
          code={YAML.stringify(eventPluginConfig)}
          language="yml"
        />
      </Stack>
    </Stack>
  );
};
