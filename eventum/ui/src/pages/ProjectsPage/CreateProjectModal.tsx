import { Button, Group, Stack, Text } from '@mantine/core';
import { modals } from '@mantine/modals';
import { IconBraces, IconCode, IconFileDescription } from '@tabler/icons-react';
import { FC } from 'react';

import {
  CreateProjectSubmitModal,
  CreateProjectSubmitModalProps,
} from './ProjectNameModal';

interface CreateProjectModalProps {
  existingProjectNames: string[];
}

export const CreateProjectModal: FC<CreateProjectModalProps> = ({
  existingProjectNames,
}) => {
  function handleCreateProject(
    projectType: CreateProjectSubmitModalProps['projectType']
  ) {
    modals.open({
      title: 'Creating project',
      children: (
        <CreateProjectSubmitModal
          existingProjectNames={existingProjectNames}
          projectType={projectType}
        />
      ),
    });
  }
  return (
    <Stack>
      <Button
        variant="default"
        h="100px"
        onClick={() => handleCreateProject('jinja')}
      >
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
      <Button
        variant="default"
        h="100px"
        onClick={() => handleCreateProject('replay')}
      >
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
      <Button
        variant="default"
        h="100px"
        onClick={() => handleCreateProject('script')}
      >
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
  );
};
