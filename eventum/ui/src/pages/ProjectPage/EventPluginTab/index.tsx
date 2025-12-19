import { Center, Divider, Grid, Stack, Text } from '@mantine/core';
import { FC, useCallback, useState } from 'react';

import { EventPluginsList } from '../PluginsList';
import { EventPluginParams } from './EventPluginParams';
import { Workspace } from './Workspace';
import { GetPluginConfigProvider } from './context/GetPluginConfigContext';
import { PLUGIN_DEFAULT_CONFIGS } from '@/api/routes/generator-configs/modules/plugins/registry';
import { EventPluginNamedConfig } from '@/api/routes/generator-configs/schemas/plugins/event';
import { EventPluginName } from '@/api/routes/generator-configs/schemas/plugins/event/base-config';

interface EventPluginTabProps {
  eventPluginConfig: EventPluginNamedConfig;
}

export const EventPluginTab: FC<EventPluginTabProps> = ({
  eventPluginConfig,
}) => {
  const [selectedPluginIndex, setSelectedPluginIndex] = useState(0);
  const [pluginsConfig, setPluginsConfig] = useState<EventPluginNamedConfig[]>([
    eventPluginConfig,
  ]);
  const [pluginNames, setPluginNames] = useState<string[]>(
    pluginsConfig.map((plugin) => Object.keys(plugin)[0]!)
  );

  const handleAddNewPlugin = useCallback(
    (pluginType: 'event', pluginName: EventPluginName) => {
      const defaultConfig = PLUGIN_DEFAULT_CONFIGS[pluginType][pluginName];

      setPluginsConfig([
        {
          [pluginName]: defaultConfig,
        },
      ] as EventPluginNamedConfig[]);

      setPluginNames([pluginName]);
    },
    []
  );

  const handleDeletePlugin = useCallback(() => {
    setPluginsConfig([]);
    setPluginNames([]);
  }, []);

  const handleConfigChange = useCallback((config: EventPluginNamedConfig) => {
    setPluginsConfig([config]);
  }, []);

  return (
    <Grid gutter="lg">
      <Grid.Col span={2}>
        <Stack>
          <EventPluginsList
            type="event"
            plugins={pluginNames}
            onChangeSelectedPlugin={setSelectedPluginIndex}
            selectedPlugin={selectedPluginIndex}
            onAddNewPlugin={handleAddNewPlugin}
            onDeletePlugin={handleDeletePlugin}
            maxPlugins={1}
          />
        </Stack>
      </Grid.Col>
      <Grid.Col span={7}>
        <Stack>
          {pluginsConfig.length === 0 ? (
            <Center>
              <Text size="sm" c="gray.6">
                No plugins added
              </Text>
            </Center>
          ) : (
            <GetPluginConfigProvider getPluginConfig={() => pluginsConfig[0]!}>
              <Workspace
                pluginName={
                  Object.keys(pluginsConfig[0]!)[0] as EventPluginName
                }
              />
            </GetPluginConfigProvider>
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
            <EventPluginParams
              eventPluginConfig={pluginsConfig[0]!}
              onChange={handleConfigChange}
            />
          )}
        </Stack>
      </Grid.Col>
    </Grid>
  );
};
