import {
  Alert,
  Box,
  Button,
  Group,
  JsonInput,
  Skeleton,
  Stack,
} from '@mantine/core';
import { useField } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconAlertSquareRounded,
  IconArrowNarrowRight,
  IconEraser,
  IconRefresh,
} from '@tabler/icons-react';
import { FC, useEffect } from 'react';

import {
  useClearTemplateEventPluginLocalStateMutation,
  useTemplateEventPluginLocalState,
  useUpdateTemplateEventPluginLocalStateMutation,
} from '@/api/hooks/usePreview';
import { ShowErrorDetailsAnchor } from '@/components/ui/ShowErrorDetailsAnchor';
import { useProjectName } from '@/pages/ProjectPage/hooks/useProjectName';

interface LocalStateProps {
  template: string;
}

export const LocalState: FC<LocalStateProps> = ({ template }) => {
  const { projectName } = useProjectName();
  const { data, isLoading, isError, error, isSuccess, refetch } =
    useTemplateEventPluginLocalState(projectName, template);

  const field = useField<string | undefined>({
    initialValue: undefined,
    validate: (value) => {
      try {
        JSON.parse(value ?? '{}');
        return null;
      } catch {
        return 'Invalid JSON';
      }
    },
    validateOnChange: true,
  });

  useEffect(() => {
    if (isSuccess) {
      field.setValue(JSON.stringify(data, undefined, 2));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, isSuccess]);

  const updateState = useUpdateTemplateEventPluginLocalStateMutation();
  const clearState = useClearTemplateEventPluginLocalStateMutation();

  function handleUpdate() {
    const state = JSON.parse(field.getValue() ?? '{}') as Record<string, never>;

    updateState.mutate(
      { name: projectName, templateAlias: template, state: state },
      {
        onSuccess: () => {
          notifications.show({
            title: 'Success',
            message: 'State is updated',
            color: 'green',
          });
        },
        onError: (error) => {
          notifications.show({
            title: 'Error',
            message: (
              <>
                Failed to update state
                <ShowErrorDetailsAnchor error={error} prependDot />
              </>
            ),
            color: 'red',
          });
        },
      }
    );
  }

  function handleClear() {
    clearState.mutate(
      { name: projectName, templateAlias: template },
      {
        onSuccess: () => {
          notifications.show({
            title: 'Success',
            message: 'State is cleared',
            color: 'green',
          });
        },
        onError: (error) => {
          notifications.show({
            title: 'Error',
            message: (
              <>
                Failed to clear state
                <ShowErrorDetailsAnchor error={error} prependDot />
              </>
            ),
            color: 'red',
          });
        },
      }
    );
  }

  return (
    <Stack gap="xs">
      {isLoading && <Skeleton h="90px" />}

      {isError && (
        <Alert
          variant="default"
          icon={<Box c="red" component={IconAlertSquareRounded}></Box>}
          title="Failed to load state"
        >
          {error.message}
          <ShowErrorDetailsAnchor error={error} prependDot />
        </Alert>
      )}

      {isSuccess && (
        <JsonInput
          label="Local state"
          placeholder="{ ... }"
          validationError="Invalid JSON"
          minRows={4}
          autosize
          {...field.getInputProps()}
        />
      )}

      <Group grow gap="xs">
        <Button
          variant="default"
          leftSection={<IconRefresh size={16} />}
          onClick={() => {
            field.setValue(JSON.stringify(data, undefined, 2));
            void refetch();
          }}
          loading={isLoading}
        >
          Sync
        </Button>
        <Button
          variant="default"
          leftSection={<IconEraser size={16} />}
          disabled={isLoading || isError || updateState.isPending}
          loading={clearState.isPending}
          onClick={handleClear}
        >
          Clear
        </Button>
        <Button
          variant="default"
          rightSection={<IconArrowNarrowRight size={16} />}
          disabled={
            isLoading || isError || clearState.isPending || field.error !== null
          }
          loading={updateState.isPending}
          onClick={handleUpdate}
        >
          Add
        </Button>
      </Group>
    </Stack>
  );
};
