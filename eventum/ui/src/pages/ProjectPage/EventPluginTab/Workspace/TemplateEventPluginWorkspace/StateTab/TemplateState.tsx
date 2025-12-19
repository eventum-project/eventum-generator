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
  useClearTemplateEventPluginGlobalStateMutation,
  useClearTemplateEventPluginLocalStateMutation,
  useClearTemplateEventPluginSharedStateMutation,
  useTemplateEventPluginGlobalState,
  useTemplateEventPluginLocalState,
  useTemplateEventPluginSharedState,
  useUpdateTemplateEventPluginGlobalStateMutation,
  useUpdateTemplateEventPluginLocalStateMutation,
  useUpdateTemplateEventPluginSharedStateMutation,
} from '@/api/hooks/usePreview';
import { ShowErrorDetailsAnchor } from '@/components/ui/ShowErrorDetailsAnchor';
import { useProjectName } from '@/pages/ProjectPage/hooks/useProjectName';

interface TemplateStateProps {
  stateName: string;
  templateAlias: string;
  useTemplateEventPluginState:
    | typeof useTemplateEventPluginLocalState
    | typeof useTemplateEventPluginSharedState
    | typeof useTemplateEventPluginGlobalState;
  useUpdateTemplateEventPluginStateMutation:
    | typeof useUpdateTemplateEventPluginLocalStateMutation
    | typeof useUpdateTemplateEventPluginSharedStateMutation
    | typeof useUpdateTemplateEventPluginGlobalStateMutation;
  useClearTemplateEventPluginStateMutation:
    | typeof useClearTemplateEventPluginLocalStateMutation
    | typeof useClearTemplateEventPluginSharedStateMutation
    | typeof useClearTemplateEventPluginGlobalStateMutation;
}

export const TemplateState: FC<TemplateStateProps> = ({
  stateName,
  templateAlias,
  useTemplateEventPluginState,
  useUpdateTemplateEventPluginStateMutation,
  useClearTemplateEventPluginStateMutation,
}) => {
  const { projectName } = useProjectName();
  const { data, isLoading, isError, error, isSuccess, refetch } =
    useTemplateEventPluginState(projectName, templateAlias);

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

  const updateState = useUpdateTemplateEventPluginStateMutation();
  const clearState = useClearTemplateEventPluginStateMutation();

  function handleUpdate() {
    const state = JSON.parse(field.getValue() ?? '{}') as Record<string, never>;

    updateState.mutate(
      { name: projectName, templateAlias: templateAlias, state: state },
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
      { name: projectName, templateAlias: templateAlias },
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
          label={stateName}
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
