import { Stack } from '@mantine/core';
import { modals } from '@mantine/modals';
import { FC } from 'react';

import {
  CreateProjectSubmitModal,
  CreateProjectSubmitModalProps,
} from './ProjectNameModal';
import { EVENT_PLUGINS_INFO, EventPluginName } from '@/api/models/plugins';
import { AreaButton } from '@/components/ui/AreaButton';

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
          <AreaButton
            key={name}
            icon={PluginIcon}
            name={label}
            description={description}
            onClick={() => handleCreateProject(name as EventPluginName)}
          />
        )
      )}
    </Stack>
  );
};
