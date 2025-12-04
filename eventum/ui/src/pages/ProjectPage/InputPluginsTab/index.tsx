import { Center, Divider, Grid, Stack, Text } from '@mantine/core';
import { FC, useCallback, useRef, useState } from 'react';

import { InputPluginsList } from '../PluginsList';
import { InputPluginParams } from './InputPluginParams';
import TimestampsHistogram from './TimestampsHistogram';
import { PLUGIN_DEFAULT_CONFIGS } from '@/api/routes/generator-configs/modules/plugins/registry';
import { InputPluginsNamedConfig } from '@/api/routes/generator-configs/schemas';
import { InputPluginName } from '@/api/routes/generator-configs/schemas/plugins/input/base-config';

interface InputPluginsTabProps {
  inputPluginsConfig: InputPluginsNamedConfig;
}

export const InputPluginsTab: FC<InputPluginsTabProps> = ({
  inputPluginsConfig,
}) => {
  const [selectedPluginIndex, setSelectedPluginIndex] = useState(0);
  const [pluginsConfig, setPluginsConfig] =
    useState<InputPluginsNamedConfig>(inputPluginsConfig);
  const [pluginNames, setPluginNames] = useState<string[]>(
    pluginsConfig.map((plugin) => Object.keys(plugin)[0]!)
  );

  const handleAddNewPlugin = useCallback(
    (pluginType: 'input', pluginName: InputPluginName) => {
      const defaultConfig = PLUGIN_DEFAULT_CONFIGS[pluginType][pluginName];

      setPluginsConfig(
        (pluginsConfig) =>
          [
            ...pluginsConfig,
            { [pluginName]: defaultConfig },
          ] as InputPluginsNamedConfig
      );
      setPluginNames((value) => [...value, pluginName]);
    },
    []
  );

  const handleDeletePlugin = useCallback((index: number) => {
    setPluginsConfig((pluginsConfig) => {
      const newConfig = [
        ...pluginsConfig.slice(0, index),
        ...pluginsConfig.slice(index + 1),
      ];

      setSelectedPluginIndex((selectedPluginIndex) =>
        selectedPluginIndex >= newConfig.length
          ? Math.max(newConfig.length - 1, 0)
          : selectedPluginIndex
      );

      return newConfig;
    });

    setPluginNames((value) => [
      ...value.slice(0, index),
      ...value.slice(index + 1),
    ]);
  }, []);

  const pluginsConfigRef = useRef(pluginsConfig);
  pluginsConfigRef.current = pluginsConfig;

  const getInputPluginsConfig = useCallback(() => {
    return pluginsConfigRef.current;
  }, []);

  return (
    <Grid gutter="lg">
      <Grid.Col span={2}>
        <Stack>
          <InputPluginsList
            type="input"
            plugins={pluginNames}
            onChangeSelectedPlugin={setSelectedPluginIndex}
            selectedPlugin={selectedPluginIndex}
            onAddNewPlugin={handleAddNewPlugin}
            onDeletePlugin={handleDeletePlugin}
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
              getInputPluginsConfig={getInputPluginsConfig}
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
