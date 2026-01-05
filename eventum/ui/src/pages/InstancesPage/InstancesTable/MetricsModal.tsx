import {
  Alert,
  Box,
  Center,
  Container,
  Divider,
  Grid,
  Group,
  Loader,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import {
  Icon,
  IconAlertSquareRounded,
  IconArrowsSplit2,
  IconClockPlay,
  IconCube,
  IconInfoCircle,
  IconProps,
} from '@tabler/icons-react';
import { FC, ReactNode, useEffect } from 'react';

import { useGeneratorStats } from '@/api/hooks/useGenerators';
import { ShowErrorDetailsAnchor } from '@/components/ui/ShowErrorDetailsAnchor';

interface MetricsSectionProps {
  sectionName: string;
  SectionIcon: React.ForwardRefExoticComponent<
    IconProps & React.RefAttributes<Icon>
  >;
  sectionGroups: { label: string; value: ReactNode }[][];
}

const MetricsSection: FC<MetricsSectionProps> = ({
  sectionName,
  SectionIcon,
  sectionGroups,
}) => {
  return (
    <Stack gap="4px" mb="xs">
      <Group gap="xs">
        <SectionIcon size="19px" />
        <Title order={6} fw={600}>
          {sectionName}
        </Title>
      </Group>

      <Divider my="4px" />

      <Grid columns={sectionGroups.length}>
        {sectionGroups.map((sectionGroup, index) => (
          <Grid.Col key={index} span={1}>
            {sectionGroup.map((sectionItem) => (
              <Group key={sectionItem.label}>
                <Text size="sm">
                  {sectionItem.label}: {sectionItem.value}
                </Text>
              </Group>
            ))}
          </Grid.Col>
        ))}
      </Grid>

      <Stack gap="4px"></Stack>
    </Stack>
  );
};

interface MetricsModalProps {
  instanceId: string;
}

export const MetricsModal: FC<MetricsModalProps> = ({ instanceId }) => {
  const {
    data: stats,
    isLoading: isStatsLoading,
    isSuccess: isStatsSuccess,
    isError: isStatsError,
    error: statsError,
    refetch: refetchStats,
  } = useGeneratorStats(instanceId);

  useEffect(() => {
    const timeout = setInterval(() => {
      void refetchStats();
    }, 3000);

    return () => {
      clearInterval(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isStatsLoading) {
    return (
      <Center>
        <Loader size="lg" />
      </Center>
    );
  }

  if (isStatsError) {
    return (
      <Container size="md">
        <Alert
          variant="default"
          icon={<Box c="red" component={IconAlertSquareRounded}></Box>}
          title="Failed to load instance stats"
        >
          {statsError.message}
          <ShowErrorDetailsAnchor error={statsError} prependDot />
        </Alert>
      </Container>
    );
  }

  if (isStatsSuccess) {
    return (
      <Stack gap="4px">
        <Stack>
          <MetricsSection
            sectionName="Common"
            SectionIcon={IconInfoCircle}
            sectionGroups={[
              [
                { label: 'Instance', value: instanceId },
                {
                  label: 'Start time',
                  value: new Date(stats.start_time).toLocaleString(),
                },
                { label: 'Uptime', value: `${Math.round(stats.uptime)} s.` },
              ],
              [
                { label: 'Generated', value: stats.total_generated },
                { label: 'Written', value: stats.total_written },
              ],
              [
                { label: 'Input EPS', value: stats.input_eps },
                { label: 'Output EPS', value: stats.output_eps },
              ],
            ]}
          />

          <Group wrap="nowrap" align="start" grow>
            <Stack gap="xs">
              {...stats.input.map((inputPlugin) => {
                return (
                  <MetricsSection
                    key={`${inputPlugin.plugin_name} #${inputPlugin.plugin_id}`}
                    sectionName={`Input plugin (${inputPlugin.plugin_name} #${inputPlugin.plugin_id})`}
                    SectionIcon={IconClockPlay}
                    sectionGroups={[
                      [{ label: 'Generated', value: inputPlugin.generated }],
                    ]}
                  />
                );
              })}
            </Stack>

            <MetricsSection
              sectionName={`Event plugin (${stats.event.plugin_name} #${stats.event.plugin_id})`}
              SectionIcon={IconCube}
              sectionGroups={[
                [
                  {
                    label: 'Produced',
                    value: stats.event.produced,
                  },
                ],
                [
                  {
                    label: 'Produce failed',
                    value: stats.event.produce_failed,
                  },
                ],
              ]}
            />

            <Stack gap="xs">
              {...stats.output.map((outputPlugin) => {
                return (
                  <MetricsSection
                    key={`${outputPlugin.plugin_name} #${outputPlugin.plugin_id}`}
                    sectionName={`Output plugin (${outputPlugin.plugin_name} #${outputPlugin.plugin_id})`}
                    SectionIcon={IconArrowsSplit2}
                    sectionGroups={[
                      [{ label: 'Written', value: outputPlugin.written }],
                      [
                        {
                          label: 'Format failed',
                          value: outputPlugin.format_failed,
                        },
                        {
                          label: 'Write failed',
                          value: outputPlugin.write_failed,
                        },
                      ],
                    ]}
                  />
                );
              })}
            </Stack>
          </Group>
        </Stack>
      </Stack>
    );
  }

  return null;
};
