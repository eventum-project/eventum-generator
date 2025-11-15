import { Button, Group, Stack, Text } from '@mantine/core';
import { modals } from '@mantine/modals';
import { capitalCase } from 'change-case';
import { FC } from 'react';

import {
  CreateProjectSubmitModal,
  CreateProjectSubmitModalProps,
} from './ProjectNameModal';
import { EVENT_PLUGINS_INFO, EventPluginName } from '@/api/models/plugins';

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
      {Object.entries(EVENT_PLUGINS_INFO).map(
        ([name, { label, description, icon: PluginIcon }]) => (
          <Button
            key={name}
            variant="default"
            h="100px"
            onClick={() => handleCreateProject(name as EventPluginName)}
          >
            <Stack gap="xs" align="center">
              <Group gap="xs">
                <PluginIcon size={18} />
                {capitalCase(label)} based project
              </Group>
              <Text fz="sm" c="gray.6">
                {description}
              </Text>
            </Stack>
          </Button>
        )
      )}
    </Stack>
  );
};
