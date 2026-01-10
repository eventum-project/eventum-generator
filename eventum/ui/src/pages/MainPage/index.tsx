import {
  Alert,
  Box,
  Center,
  Container,
  Grid,
  Group,
  Indicator,
  Loader,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconAlertSquareRounded } from '@tabler/icons-react';
import { useEffect } from 'react';

import { InstancesStatsPanel } from './InstancesStatsPanel';
import { LastInstancesListPanel } from './LastInstancesListPanel';
import { PerformancePanel } from './PerformancePanel';
import { useGenerators } from '@/api/hooks/useGenerators';
import { useInstanceInfo } from '@/api/hooks/useInstance';
import { ShowErrorDetailsAnchor } from '@/components/ui/ShowErrorDetailsAnchor';

export default function MainPage() {
  const {
    data: instanceInfo,
    isLoading: isInstanceInfoLoading,
    isError: isInstanceInfoError,
    isSuccess: isInstanceInfoSuccess,
    error: instanceInfoError,
    refetch: refetchInstanceInfo,
  } = useInstanceInfo();

  const {
    data: generators,
    isLoading: isGeneratorsLoading,
    isError: isGeneratorsError,
    error: generatorsError,
    isSuccess: isGeneratorsSuccess,
    refetch: refetchGenerators,
  } = useGenerators();

  useEffect(() => {
    const timeout = setInterval(() => {
      void refetchInstanceInfo();
      void refetchGenerators();
    }, 5000);

    return () => clearInterval(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isInstanceInfoLoading || isGeneratorsLoading) {
    return (
      <Center>
        <Loader size="lg" />
      </Center>
    );
  }

  if (isInstanceInfoError) {
    return (
      <Container size="md">
        <Alert
          variant="default"
          icon={<Box c="red" component={IconAlertSquareRounded}></Box>}
          title="Failed to load instance info"
        >
          {instanceInfoError.message}
          <ShowErrorDetailsAnchor error={instanceInfoError} prependDot />
        </Alert>
      </Container>
    );
  }

  if (isGeneratorsError) {
    return (
      <Container size="md">
        <Alert
          variant="default"
          icon={<Box c="red" component={IconAlertSquareRounded}></Box>}
          title="Failed to load generator statuses"
        >
          {generatorsError.message}
          <ShowErrorDetailsAnchor error={generatorsError} prependDot />
        </Alert>
      </Container>
    );
  }

  if (isInstanceInfoSuccess && isGeneratorsSuccess) {
    return (
      <Container size="100%">
        <Stack>
          <Group justify="space-between">
            <Title order={2} fw="500">
              Overview
            </Title>

            <Group wrap="nowrap" gap="12px">
              <Indicator
                color="green.6"
                position="middle-center"
                size="8px"
                processing
              />
              <Text c="gray.6" size="sm">
                Connected
              </Text>
            </Group>
          </Group>

          <Grid columns={12}>
            <Grid.Col span={9}>
              <PerformancePanel instanceInfo={instanceInfo} />
            </Grid.Col>
            <Grid.Col span={3}>
              <Stack>
                <InstancesStatsPanel generators={generators} />
                <LastInstancesListPanel generators={generators} />
              </Stack>
            </Grid.Col>
          </Grid>
        </Stack>
      </Container>
    );
  }

  return null;
}
