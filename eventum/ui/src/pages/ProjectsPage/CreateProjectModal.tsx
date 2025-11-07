import { Button, Group, Modal, Stack, Text } from '@mantine/core';
import { IconBraces, IconCode, IconFileDescription } from '@tabler/icons-react';
import { FC } from 'react';

interface CreateProjectModalProps {
  opened: boolean;
  onClose: () => void;
}

export const CreateProjectModal: FC<CreateProjectModalProps> = ({
  opened,
  onClose,
}) => {
  return (
    <Modal title="New project" size="lg" opened={opened} onClose={onClose}>
      <Stack>
        <Button variant="default" h="100px">
          <Stack gap="xs" align="center">
            <Group gap="xs">
              <IconBraces size={18} />
              Template based project
            </Group>
            <Text fz="sm" c="gray.6">
              Generate events using Jinja templates
            </Text>
          </Stack>
        </Button>
        <Button variant="default" h="100px">
          <Stack gap="xs" align="center">
            <Group gap="xs">
              <IconFileDescription size={18} />
              Log based project
            </Group>
            <Text fz="sm" c="gray.6">
              Replay events from existing log files
            </Text>
          </Stack>
        </Button>
        <Button variant="default" h="100px">
          <Stack gap="xs" align="center">
            <Group gap="xs">
              <IconCode size={18} />
              Script based project
            </Group>
            <Text fz="sm" c="gray.6">
              Generate events using Python programming language
            </Text>
          </Stack>
        </Button>
      </Stack>
    </Modal>
  );
};
