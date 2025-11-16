import { ActionIcon, Button, NavLink, Stack, Text } from '@mantine/core';
import { modals } from '@mantine/modals';
import { Icon, IconPlus, IconTrash } from '@tabler/icons-react';
import { capitalCase } from 'change-case';
import { FC } from 'react';

import {
  EVENT_PLUGINS_INFO,
  INPUT_PLUGINS_INFO,
  InputPluginName,
  OUTPUT_PLUGINS_INFO,
  PluginType,
} from '@/api/models/plugins';
import { AreaButton } from '@/components/ui/AreaButton';

interface PluginsListProps {
  type: PluginType;
  plugins: string[];
  onChangeSelectedPlugin: (index: number) => void;
  selectedPlugin: number;
  onAddNewPlugin: (name: InputPluginName) => void;
  onDeletePlugin: (index: number) => void;
}

const pluginTypeToInfo = {
  input: INPUT_PLUGINS_INFO,
  event: EVENT_PLUGINS_INFO,
  output: OUTPUT_PLUGINS_INFO,
};

export const PluginsList: FC<PluginsListProps> = ({
  type,
  plugins,
  onChangeSelectedPlugin,
  selectedPlugin,
  onAddNewPlugin,
  onDeletePlugin,
}) => {
  function handleDeletePlugin(index: number) {
    modals.openConfirmModal({
      title: 'Deleting plugin',
      children: (
        <Text size="sm">
          Plugin{' '}
          <b>
            {plugins[index]} (#{index + 1})
          </b>{' '}
          will be deleted. Do you want to continue?
        </Text>
      ),
      labels: { cancel: 'Cancel', confirm: 'Confirm' },
      onConfirm: () => {
        onDeletePlugin(index);
        modals.closeAll();
      },
    });
  }

  function handleAddPlugin() {
    modals.open({
      title: 'Adding plugin',
      children: (
        <Stack>
          {Object.entries(pluginTypeToInfo[type]).map(
            ([name, { label, icon: PluginIcon, description }]) => (
              <AreaButton
                key={name}
                icon={PluginIcon as Icon}
                name={label as string}
                description={description as string}
                onClick={() => {
                  onAddNewPlugin(name as InputPluginName);
                  modals.closeAll();
                }}
                h="75px"
                gap="4px"
              />
            )
          )}
        </Stack>
      ),
      size: 'lg',
    });
  }

  return (
    <Stack>
      <Stack gap="xs">
        {plugins.map((item, idx) => (
          <NavLink
            key={idx}
            label={item
              .split('_')
              .map((item) => capitalCase(item))
              .join(' ')}
            active={idx === selectedPlugin}
            style={{ borderRadius: '8px' }}
            p="4px 4px 4px 12px"
            onClick={() => onChangeSelectedPlugin(idx)}
            rightSection={
              <ActionIcon
                variant="transparent"
                c="red"
                title="Remove"
                size="lg"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeletePlugin(idx);
                }}
              >
                <IconTrash size={20} />
              </ActionIcon>
            }
          />
        ))}
      </Stack>
      <Button
        variant="default"
        title="Add new plugin"
        onClick={handleAddPlugin}
      >
        <IconPlus size={20} />
      </Button>
    </Stack>
  );
};
