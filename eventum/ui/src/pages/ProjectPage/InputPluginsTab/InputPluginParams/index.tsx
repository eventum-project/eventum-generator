import { CodeHighlight } from '@mantine/code-highlight';
import { Stack, Text } from '@mantine/core';
import { FC } from 'react';
import YAML from 'yaml';

import { TimerInputPluginParams } from './TimerInputPluginParams';
import {
  InputPluginConfig,
  InputPluginNamedConfig,
} from '@/api/routes/generator-configs/schemas/plugins/input';
import { InputPluginName } from '@/api/routes/generator-configs/schemas/plugins/input/base-config';

interface InputPluginParamsProps {
  inputPluginConfig: InputPluginNamedConfig;
  onChange: (inputPluginConfig: InputPluginNamedConfig) => void;
}

type PluginNameToConfigType = {
  [K in InputPluginName]: Extract<
    InputPluginNamedConfig,
    Record<K, unknown>
  >[K];
};

const pluginNamesToParamsComponent = {
  cron: '',
  http: '',
  linspace: '',
  static: '',
  time_patterns: '',
  timer: TimerInputPluginParams,
  timestamps: '',
} as const satisfies {
  [K in InputPluginName]: FC<{
    initialConfig: PluginNameToConfigType[K];
    onChange: (config: PluginNameToConfigType[K]) => unknown;
  }>;
};

export const InputPluginParams: FC<InputPluginParamsProps> = ({
  inputPluginConfig,
  onChange,
}) => {
  const [pluginName, pluginConfig] = Object.entries(inputPluginConfig)[0] as [
    InputPluginName,
    InputPluginConfig,
  ];
  const ParamsComponent = pluginNamesToParamsComponent[pluginName];

  return (
    <Stack>
      <ParamsComponent
        initialConfig={pluginConfig}
        onChange={(newConfig) => {
          onChange({ [pluginName]: newConfig });
        }}
      />
      <Stack gap="4px">
        <Text size="sm" fw="bold">
          Configuration preview
        </Text>
        <CodeHighlight
          code={YAML.stringify(inputPluginConfig)}
          language="yml"
        />
      </Stack>
    </Stack>
  );
};
