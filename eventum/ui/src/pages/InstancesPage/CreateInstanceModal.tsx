import {
  Alert,
  Box,
  Button,
  Center,
  Container,
  Flex,
  Loader,
  Select,
  Stack,
  TextInput,
} from '@mantine/core';
import { isNotEmpty, useForm } from '@mantine/form';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconAlertSquareRounded } from '@tabler/icons-react';
import { FC } from 'react';

import {
  useGeneratorConfigPathMutation,
  useGeneratorDirs,
} from '@/api/hooks/useGeneratorConfigs';
import { useAddGeneratorMutation } from '@/api/hooks/useGenerators';
import { GeneratorParameters } from '@/api/routes/generators/schemas';
import { ShowErrorDetailsAnchor } from '@/components/ui/ShowErrorDetailsAnchor';

interface CreateInstanceModalProps {
  existingInstanceIds: string[];
}

export const CreateInstanceModal: FC<CreateInstanceModalProps> = ({
  existingInstanceIds,
}) => {
  const form = useForm<GeneratorParameters>({
    initialValues: {
      id: '',
      path: '',
    },
    validate: {
      id: (value) => {
        if (!value) {
          return 'Instance name is required';
        }
        if (existingInstanceIds.includes(value)) {
          return 'Instance with this name already exists';
        }

        return null;
      },
      path: isNotEmpty('Path is required'),
    },
    validateInputOnChange: true,
    onSubmitPreventDefault: 'always',
  });

  const {
    data: generatorDirs,
    isLoading: isGeneratorDirsLoading,
    isSuccess: isGeneratorDirsSuccess,
    isError: isGeneratorDirsError,
    error: generatorDirsError,
  } = useGeneratorDirs(false);

  const addGenerator = useAddGeneratorMutation();

  const getGeneratorConfigPath = useGeneratorConfigPathMutation();

  function handleCreateGenerator(values: typeof form.values) {
    getGeneratorConfigPath.mutate(
      { name: values.path },
      {
        onSuccess: (resolvedPath) => {
          addGenerator.mutate(
            { id: values.id, params: { ...values, path: resolvedPath } },
            {
              onSuccess: () => {
                notifications.show({
                  title: 'Success',
                  message: 'Instance is created',
                  color: 'green',
                });
                modals.closeAll();
              },
              onError: (error) => {
                notifications.show({
                  title: 'Error',
                  message: (
                    <>
                      Failed to create instance
                      <ShowErrorDetailsAnchor error={error} prependDot />
                    </>
                  ),
                  color: 'red',
                });
              },
            }
          );
        },
        onError: (error) => {
          notifications.show({
            title: 'Error',
            message: (
              <>
                Failed to resolve project config path
                <ShowErrorDetailsAnchor error={error} prependDot />
              </>
            ),
            color: 'red',
          });
        },
      }
    );
  }

  if (isGeneratorDirsLoading) {
    return (
      <Center>
        <Loader size="lg" />
      </Center>
    );
  }

  if (isGeneratorDirsError) {
    return (
      <Container size="md">
        <Alert
          variant="default"
          icon={<Box c="red" component={IconAlertSquareRounded}></Box>}
          title="Failed to load list of projects"
        >
          {generatorDirsError.message}
          <ShowErrorDetailsAnchor error={generatorDirsError} prependDot />
        </Alert>
      </Container>
    );
  }

  if (isGeneratorDirsSuccess) {
    return (
      <form onSubmit={form.onSubmit(handleCreateGenerator)}>
        <Stack>
          <TextInput
            label="Instance name"
            placeholder="name"
            required
            {...form.getInputProps('id')}
          />
          <Select
            label="Project name"
            data={generatorDirs}
            searchable
            nothingFoundMessage="No project found"
            placeholder="name"
            clearable
            required
            {...form.getInputProps('path')}
          />

          <Flex justify="end">
            <Button
              disabled={!form.isValid()}
              loading={addGenerator.isPending}
              type="submit"
            >
              Create
            </Button>
          </Flex>
        </Stack>
      </form>
    );
  }

  return null;
};
