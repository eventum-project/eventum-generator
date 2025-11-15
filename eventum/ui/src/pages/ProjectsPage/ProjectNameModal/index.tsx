import { Button, Group, Stack, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { FC, useState } from 'react';

import {
  getDefaultInputPluginDefaultConfig,
  getDefaultOutputPluginDefaultConfig,
  getEventPluginAsset,
  getEventPluginDefaultConfig,
} from './start-content';
import {
  useCreateGeneratorConfigMutation,
  useUploadGeneratorFileMutation,
} from '@/api/hooks/useGeneratorConfigs';
import { EventPluginName } from '@/api/models/plugins';
import { ShowErrorDetailsAnchor } from '@/components/ui/ShowErrorDetailsAnchor';

const VALID_PROJECT_NAME_PATTERN = /^[A-Za-z0-9_-]+$/;

export interface CreateProjectSubmitModalProps {
  existingProjectNames: string[];
  projectType: EventPluginName;
}

export const CreateProjectSubmitModal: FC<CreateProjectSubmitModalProps> = ({
  existingProjectNames,
  projectType,
}) => {
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  const createGeneratorConfig = useCreateGeneratorConfigMutation();
  const uploadGeneratorFile = useUploadGeneratorFileMutation();

  const form = useForm({
    initialValues: {
      projectName: '',
    },
    validate: {
      projectName: (value) => {
        if (!value) return 'Project name is required';

        const isValid = VALID_PROJECT_NAME_PATTERN.test(value);

        if (!isValid) {
          return 'Only letters, digits and symbols "-" and "_" are allowed';
        }

        if (existingProjectNames.includes(value)) {
          return 'Project with such name already exists';
        }

        return null;
      },
    },
    validateInputOnChange: true,
    onSubmitPreventDefault: 'always',
  });

  function handleCreate() {
    setIsCreatingProject(true);

    const generatorConfig = {
      input: [getDefaultInputPluginDefaultConfig()],
      event: getEventPluginDefaultConfig(projectType),
      output: [getDefaultOutputPluginDefaultConfig()],
    };

    createGeneratorConfig.mutate(
      {
        name: form.values.projectName,
        config: generatorConfig,
      },
      {
        onError: (error) => {
          modals.closeAll();
          setIsCreatingProject(false);

          notifications.show({
            title: 'Error',
            message: (
              <>
                Failed to create new project.{' '}
                <ShowErrorDetailsAnchor error={error} />
              </>
            ),
            color: 'red',
          });
        },
        onSuccess: () => {
          const asset = getEventPluginAsset(projectType);

          uploadGeneratorFile.mutate(
            {
              name: form.values.projectName,
              filepath: asset.path,
              content: asset.content,
            },
            {
              onError: (error) => {
                notifications.show({
                  title: 'Error',
                  message: (
                    <>
                      Failed to add initial assets to project.{' '}
                      <ShowErrorDetailsAnchor error={error} />
                    </>
                  ),
                  color: 'red',
                });
              },
            }
          );

          modals.closeAll();
          setIsCreatingProject(false);

          notifications.show({
            title: 'Success',
            message: 'Project is created',
            color: 'green',
          });
        },
      }
    );
  }

  return (
    <Stack>
      <TextInput label="Project name" {...form.getInputProps('projectName')} />
      <Group justify="end">
        <Button
          onClick={handleCreate}
          disabled={isCreatingProject || !form.isDirty() || !form.isValid()}
        >
          {isCreatingProject ? 'Creating...' : 'Create'}
        </Button>
      </Group>
    </Stack>
  );
};
