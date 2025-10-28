import {
  Alert,
  Box,
  Center,
  Container,
  Grid,
  Loader,
  Stack,
  Text,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconAlertSquareRounded } from '@tabler/icons-react';
import { AxiosError } from 'axios';
import { useEffect } from 'react';
import validator from 'validator';

import { APIParameters } from './APIParameters';
import { GenerationParameters } from './GenerationParameters';
import { LoggingParameters } from './LoggingParameters';
import { PathParameters } from './PathParameters';
import { SavePanel } from './SavePanelContent';
import {
  useInstanceSettings,
  useRestartInstanceMutation,
  useUpdateInstanceSettingsMutation,
} from '@/api/hooks/useInstance';
import { Settings } from '@/api/routes/instance/schemas';
import { FloatingPanel } from '@/components/ui/FloatingPanel';
import { FloatingTableOfContents } from '@/components/ui/FloatingTableOfContents';

export default function SettingsPage() {
  const {
    data: instanceSettings,
    isLoading: isLoadingSettings,
    isSuccess: isSettingsSuccess,
    isError: isSettingsError,
    error: settingsError,
  } = useInstanceSettings();
  const updateInstanceSettings = useUpdateInstanceSettingsMutation();
  const restartInstance = useRestartInstanceMutation();

  const form = useForm<Settings>({
    validate: {
      api: {
        host: (value, values) => {
          if (value.length === 0) {
            return null;
          }

          if (values.api.enabled) {
            if (
              validator.isIP(value) ||
              validator.isFQDN(value, {
                require_tld: false,
                allow_underscores: true,
              })
            ) {
              return null;
            } else {
              return 'Invalid hostname or IP address';
            }
          } else {
            return null;
          }
        },
      },
    },
    validateInputOnChange: true,
    onSubmitPreventDefault: 'always',
  });

  useEffect(() => {
    if (isSettingsSuccess) {
      form.initialize(instanceSettings);
      form.resetDirty();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSettingsSuccess]);

  if (isLoadingSettings) {
    return (
      <Center>
        <Loader size="lg" />
      </Center>
    );
  }

  if (isSettingsError) {
    return (
      <Container size="md" mt="xl">
        <Alert
          variant="default"
          icon={<Box c="red" component={IconAlertSquareRounded}></Box>}
          title="Failed to get instance settings"
        >
          {settingsError.message}
        </Alert>
      </Container>
    );
  }

  function handleSubmit(values: typeof form.values) {
    updateInstanceSettings.mutate(
      { settings: values },
      {
        onSuccess: () => {
          restartInstance.mutate(undefined, {
            onSuccess: () => {
              notifications.show({
                title: 'Success',
                message: 'Settings was successfully updated',
                color: 'green',
              });
              notifications.show({
                title: 'Info',
                message: 'Instance is currently restarting',
                color: 'blue',
              });
            },
            onError: () => {
              if (settingsError instanceof AxiosError) {
                if (
                  settingsError?.status !== undefined &&
                  settingsError.status >= 500
                ) {
                  notifications.show({
                    title: 'Error',
                    message: 'Server error, please try again later',
                    color: 'red',
                  });
                  return;
                }

                const responseData = settingsError?.response?.data as
                  | { detail?: string }
                  | undefined;
                const detail = responseData?.detail;

                if (detail && typeof detail === 'string') {
                  notifications.show({
                    title: 'Error',
                    message: detail,
                    color: 'red',
                  });
                  return;
                }

                notifications.show({
                  title: 'Error',
                  message: settingsError.message,
                  color: 'red',
                });
              } else {
                notifications.show({
                  title: 'Error',
                  message: 'Failed to connect to server',
                  color: 'red',
                });
              }
            },
          });
          form.resetDirty();
        },
        onError: (error: unknown) => {
          if (error instanceof AxiosError) {
            if (error?.status !== undefined && error.status >= 500) {
              notifications.show({
                title: 'Error',
                message: 'Server error, please try again later',
                color: 'red',
              });
              return;
            }

            const responseData = error?.response?.data as
              | { detail?: string }
              | undefined;
            const detail = responseData?.detail;

            // TODO: implement setting errors to form

            if (detail && typeof detail === 'string') {
              notifications.show({
                title: 'Error',
                message: detail,
                color: 'red',
              });
              return;
            }

            notifications.show({
              title: 'Error',
              message: error.message,
              color: 'red',
            });
          } else {
            notifications.show({
              title: 'Error',
              message: 'Failed to connect to server',
              color: 'red',
            });
          }
        },
      }
    );
  }

  if (isSettingsSuccess && form.initialized) {
    return (
      <>
        <Container size="xl" mt="xl" mb="400px">
          <Grid gutter="xl">
            <Grid.Col span="auto">
              <form>
                <Stack>
                  <APIParameters form={form} />
                  <GenerationParameters form={form} />
                  <PathParameters form={form} />
                  <LoggingParameters form={form} />
                </Stack>
                <FloatingPanel mounted={form.isDirty()}>
                  <SavePanel
                    form={form}
                    onSave={() =>
                      modals.openConfirmModal({
                        title: 'Settings update',
                        children: (
                          <Text size="sm">
                            Instance will be restarted. Do you want to continue?
                          </Text>
                        ),
                        onConfirm: () => handleSubmit(form.getValues()),
                      })
                    }
                  />
                </FloatingPanel>
              </form>
            </Grid.Col>

            <Grid.Col span={3}>
              <FloatingTableOfContents />
            </Grid.Col>
          </Grid>
        </Container>
      </>
    );
  }

  return <></>;
}
