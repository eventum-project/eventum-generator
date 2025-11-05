import {
  Alert,
  Box,
  Button,
  Container,
  Divider,
  Group,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import {
  IconInfoSquareRounded,
  IconPower,
  IconReload,
} from '@tabler/icons-react';

import {
  useRestartInstanceMutation,
  useStopInstanceMutation,
} from '@/api/hooks/useInstance';
import { ShowErrorDetailsAnchor } from '@/components/ui/ShowErrorDetailsAnchor';

export default function ManagementPage() {
  const restartInstance = useRestartInstanceMutation();
  const stopInstance = useStopInstanceMutation();

  function handleOnRestart() {
    restartInstance.mutate(undefined, {
      onSuccess: () => {
        notifications.show({
          title: 'Info',
          message:
            'Restarting the instance. Service may be unavailable for some time',
          color: 'blue',
        });
      },
      onError: (error) => {
        notifications.show({
          title: 'Error',
          message: (
            <>
              Failed to restart instance.{' '}
              <ShowErrorDetailsAnchor error={error} />
            </>
          ),
          color: 'red',
        });
      },
    });
  }
  function handleOnStop() {
    stopInstance.mutate(undefined, {
      onSuccess: () => {
        notifications.show({
          title: 'Info',
          message: 'Stopping the instance',
          color: 'blue',
        });
      },
      onError: (error) => {
        notifications.show({
          title: 'Error',
          message: (
            <>
              Failed to stop instance. <ShowErrorDetailsAnchor error={error} />
            </>
          ),
          color: 'red',
        });
      },
    });
  }
  return (
    <Container size="lg" mt="xl" mb="400px">
      <Title order={2} fw={500}>
        Instance Management
      </Title>
      <Divider my="sm" />
      <Stack>
        <Alert
          variant="default"
          icon={<Box c="blue" component={IconInfoSquareRounded}></Box>}
          title="About management"
        >
          Note, that during the restart, web interface may be unavailable for
          some time. After stopping the instance you will not be able to start
          it using web interface.
        </Alert>
        <Group grow>
          <Button
            h="60px"
            variant="default"
            onClick={() =>
              modals.openConfirmModal({
                title: 'Restarting instance',
                children: (
                  <Text size="sm">
                    Instance will be restarted. Do you want to continue?
                  </Text>
                ),
                onConfirm: () => handleOnRestart(),
                labels: { cancel: 'Cancel', confirm: 'Confirm' },
              })
            }
          >
            <Box mr="5px">
              <IconReload size="16px" />
            </Box>
            Restart
          </Button>
          <Button
            h="60px"
            variant="default"
            c="red"
            onClick={() =>
              modals.openConfirmModal({
                title: 'Stopping instance',
                children: (
                  <Text size="sm">
                    Instance will be stopped. Do you want to continue?
                  </Text>
                ),
                onConfirm: () => handleOnStop(),
                labels: { cancel: 'Cancel', confirm: 'Confirm' },
              })
            }
          >
            <Box mr="5px">
              <IconPower size="16px" />
            </Box>
            Stop
          </Button>
        </Group>
      </Stack>
    </Container>
  );
}
