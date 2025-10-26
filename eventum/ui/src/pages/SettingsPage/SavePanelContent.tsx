import { ActionIcon, Button, Group, List, Popover, Title } from '@mantine/core';
import { UseFormReturnType } from '@mantine/form';
import { IconList } from '@tabler/icons-react';
import { FC } from 'react';

import { Settings } from '@/api/routes/instance/schemas';

interface SavePanelProps {
  form: UseFormReturnType<Settings>;
  onSave: () => void;
}

export const SavePanel: FC<SavePanelProps> = ({ form, onSave }) => {
  return (
    <Group align="center" justify="space-between" w="100%" mx="md">
      <Group mah="50px">
        <Title size="sm">There are unsaved changes</Title>
      </Group>
      <Group>
        <Popover position="top-end" withArrow shadow="md">
          <Popover.Target>
            <ActionIcon
              variant="default"
              size="lg"
              title="Show changed settings"
            >
              <IconList />
            </ActionIcon>
          </Popover.Target>
          <Popover.Dropdown>
            <List size="sm">
              {Object.entries(form.getDirty())
                .filter(([, changed]) => changed)
                .map(([value]) => (
                  <List.Item key={value}>{value}</List.Item>
                ))}
            </List>
          </Popover.Dropdown>
        </Popover>
        <Button onClick={onSave}>Save</Button>
      </Group>
    </Group>
  );
};
