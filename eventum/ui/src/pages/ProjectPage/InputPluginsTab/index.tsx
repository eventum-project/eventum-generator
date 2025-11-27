import { Center, Divider, Grid, Stack, Text } from '@mantine/core';
import { FC, useState } from 'react';

import { PluginsList } from '../PluginsList';
import { InputPluginParams } from './InputPluginParams';
import { TimestampsHistogram } from './TimestampsHistogram';
import { PLUGIN_DEFAULT_CONFIGS } from '@/api/routes/generator-configs/modules/plugins/registry';
import { InputPluginsNamedConfig } from '@/api/routes/generator-configs/schemas';

interface InputPluginsTabProps {
  inputPluginsConfig: InputPluginsNamedConfig;
}

export const InputPluginsTab: FC<InputPluginsTabProps> = ({
  inputPluginsConfig,
}) => {
  const [selectedPluginIndex, setSelectedPluginIndex] = useState(0);
  const [pluginsConfig, setPluginsConfig] =
    useState<InputPluginsNamedConfig>(inputPluginsConfig);

  return (
    <Grid gutter="lg">
      <Grid.Col span={2}>
        <Stack>
          <PluginsList
            type="input"
            plugins={pluginsConfig.map((plugin) => Object.keys(plugin)[0]!)}
            onChangeSelectedPlugin={setSelectedPluginIndex}
            selectedPlugin={selectedPluginIndex}
            onAddNewPlugin={(pluginType, pluginName) => {
              const defaultConfig =
                PLUGIN_DEFAULT_CONFIGS[pluginType][pluginName];

              const newConfig = [
                ...pluginsConfig,
                { [pluginName]: defaultConfig },
              ] as InputPluginsNamedConfig;

              setPluginsConfig(newConfig);
            }}
            onDeletePlugin={(index) => {
              const newConfig = [
                ...pluginsConfig.slice(0, index),
                ...pluginsConfig.slice(index + 1),
              ];
              setPluginsConfig(newConfig);

              if (selectedPluginIndex >= newConfig.length) {
                setSelectedPluginIndex(Math.max(newConfig.length - 1, 0));
              }
            }}
          />
        </Stack>
      </Grid.Col>
      <Grid.Col span={7}>
        <Stack>
          <Text size="sm" fw="bold">
            Timestamps preview
          </Text>
          <Divider />
          {pluginsConfig.length === 0 ? (
            <Center>
              <Text size="sm" c="gray.6">
                No plugins added
              </Text>
            </Center>
          ) : (
            <TimestampsHistogram
              selectedPluginIndex={selectedPluginIndex}
              inputPluginsConfig={pluginsConfig}
            />
          )}
        </Stack>
      </Grid.Col>
      <Grid.Col span={3}>
        <Stack>
          <Text size="sm" fw="bold">
            Plugin parameters
          </Text>
          <Divider />
          {pluginsConfig.length === 0 ? (
            <Center>
              <Text size="sm" c="gray.6">
                No plugins added
              </Text>
            </Center>
          ) : (
            <InputPluginParams
              key={selectedPluginIndex}
              inputPluginConfig={pluginsConfig[selectedPluginIndex]!}
              onChange={(config) => {
                const newConfig = [...pluginsConfig];
                newConfig[selectedPluginIndex] = config;

                setPluginsConfig(newConfig);
              }}
            />
          )}
        </Stack>
      </Grid.Col>
    </Grid>
  );
};
