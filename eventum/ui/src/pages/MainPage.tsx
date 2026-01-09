import { DonutChart } from '@mantine/charts';
import {
  Alert,
  Box,
  Center,
  Container,
  DefaultMantineColor,
  Flex,
  Group,
  Indicator,
  Loader,
  Paper,
  Stack,
  StyleProp,
  Text,
  Title,
} from '@mantine/core';
import {
  Icon,
  IconAlertSquareRounded,
  IconAlertTriangle,
  IconBox,
  IconPlayerPlay,
  IconPower,
  IconProps,
  ReactNode,
} from '@tabler/icons-react';
import bytes from 'bytes';
import { useEffect } from 'react';
import { ResponsiveContainer } from 'recharts';

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
  } = useGenerators();

  useEffect(() => {
    const timeout = setInterval(() => {
      void refetchInstanceInfo();
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
    const panelsRow1: {
      content: ReactNode;
      caption: ReactNode;
      icon: React.ForwardRefExoticComponent<
        IconProps & React.RefAttributes<Icon>
      >;
      iconColor: StyleProp<DefaultMantineColor>;
    }[] = [
      {
        content: generators.length,
        caption: 'Total',
        icon: IconBox,
        iconColor: 'primary',
      },
      {
        content: generators.filter((generator) => generator.status.is_running)
          .length,
        caption: 'Running',
        icon: IconPlayerPlay,
        iconColor: 'green.4',
      },
      {
        content: generators.filter(
          (generator) =>
            !generator.status.is_running &&
            (!generator.status.is_ended_up ||
              generator.status.is_ended_up_successfully)
        ).length,
        caption: 'Not running',
        icon: IconPower,
        iconColor: 'gray.6',
      },
      {
        content: generators.filter(
          (generator) =>
            generator.status.is_ended_up &&
            !generator.status.is_ended_up_successfully
        ).length,
        caption: 'Failed',
        icon: IconAlertTriangle,
        iconColor: 'red.6',
      },
    ];

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

          <Stack gap="4px">
            <Title order={3} fw="500">
              Instances
            </Title>

            <Group grow gap="xs">
              {panelsRow1.map((panel, index) => (
                <Paper key={index} withBorder shadow="sm" py="xl">
                  <Flex justify="center" align="center">
                    <Stack gap="xs" justify="center" align="center">
                      <Title order={1} fw="500">
                        {panel.content}
                      </Title>
                      <Group align="center" gap="xs" wrap="nowrap">
                        <Flex c={panel.iconColor} align="center">
                          <panel.icon size={22} />
                        </Flex>
                        <Text size="sm">{panel.caption}</Text>
                      </Group>
                    </Stack>
                  </Flex>
                </Paper>
              ))}
            </Group>
          </Stack>

          <Stack gap="4px">
            <Title order={3} fw="500">
              Performance
            </Title>

            <Group grow gap="xs">
              <Paper withBorder shadow="sm">
                <Flex justify="center" align="center">
                  <ResponsiveContainer width="100%" height={250}>
                    <DonutChart
                      data={[
                        {
                          name: 'Used',
                          value: instanceInfo.memory_used_bytes,
                          color: 'primary',
                        },
                        {
                          name: 'Available',
                          value: instanceInfo.memory_available_bytes,
                          color: 'gray.6',
                        },
                      ]}
                      h="100%"
                      w="100%"
                      chartLabel="Memory"
                      withLabelsLine
                      labelsType="percent"
                      withLabels
                      startAngle={90}
                      endAngle={-270}
                      valueFormatter={(value) => bytes(value) ?? '-'}
                    />
                  </ResponsiveContainer>
                </Flex>
              </Paper>
              <Paper withBorder shadow="sm">
                <Flex justify="center" align="center">
                  <ResponsiveContainer width="100%" height={250}>
                    <DonutChart
                      data={[
                        {
                          name: 'Used',
                          value: instanceInfo.cpu_percent,
                          color: 'primary',
                        },
                        {
                          name: 'Available',
                          value: 100 - instanceInfo.cpu_percent,
                          color: 'gray.6',
                        },
                      ]}
                      h="100%"
                      w="100%"
                      chartLabel="CPU"
                      withLabelsLine
                      labelsType="percent"
                      withLabels
                      startAngle={90}
                      endAngle={-270}
                    />
                  </ResponsiveContainer>
                </Flex>
              </Paper>

              <Paper withBorder shadow="sm">
                <Flex justify="center" align="center">
                  <ResponsiveContainer width="100%" height={250}>
                    <DonutChart
                      data={[
                        {
                          name: 'Sent',
                          value: instanceInfo.network_sent_bytes,
                          color: 'yellow.6',
                        },
                        {
                          name: 'Received',
                          value: instanceInfo.network_received_bytes,
                          color: 'green.6',
                        },
                      ]}
                      h="100%"
                      w="100%"
                      chartLabel="Network"
                      withLabelsLine
                      labelsType="percent"
                      withLabels
                      startAngle={90}
                      endAngle={-270}
                      valueFormatter={(value) => bytes(value) ?? '-'}
                    />
                  </ResponsiveContainer>
                </Flex>
              </Paper>

              <Paper withBorder shadow="sm">
                <Flex justify="center" align="center">
                  <ResponsiveContainer width="100%" height={250}>
                    <DonutChart
                      data={[
                        {
                          name: 'Written',
                          value: instanceInfo.disk_written_bytes,
                          color: 'yellow.6',
                        },
                        {
                          name: 'Read',
                          value: instanceInfo.disk_read_bytes,
                          color: 'green.6',
                        },
                      ]}
                      h="100%"
                      w="100%"
                      chartLabel="Disk"
                      withLabelsLine
                      labelsType="percent"
                      withLabels
                      startAngle={90}
                      endAngle={-270}
                      valueFormatter={(value) => bytes(value) ?? '-'}
                    />
                  </ResponsiveContainer>
                </Flex>
              </Paper>
            </Group>
          </Stack>
        </Stack>
      </Container>
    );
  }

  return null;
}
