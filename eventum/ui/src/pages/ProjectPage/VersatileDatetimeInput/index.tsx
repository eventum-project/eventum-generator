import { ActionIcon, TextInput, TextInputProps } from '@mantine/core';
import { modals } from '@mantine/modals';
import { IconCalendarTime } from '@tabler/icons-react';
import { FC } from 'react';

import { ProjectNameProvider } from '../context/ProjectNameContext';
import { useProjectName } from '../hooks/useProjectName';
import { VersatileDatetimeToolModal } from './VersatileDatetimeToolModal';

export const VersatileDatetimeInput: FC<TextInputProps> = ({ ...props }) => {
  const { projectName } = useProjectName();

  return (
    <TextInput
      placeholder="time expression"
      {...props}
      rightSection={
        <ActionIcon
          variant="transparent"
          title="Open versatile datetime tool"
          onClick={() =>
            modals.open({
              title: 'Versatile datetime tool',
              children: (
                <ProjectNameProvider initialProjectName={projectName}>
                  <VersatileDatetimeToolModal />
                </ProjectNameProvider>
              ),
              size: 'xl',
            })
          }
        >
          <IconCalendarTime size={20} />
        </ActionIcon>
      }
    />
  );
};
