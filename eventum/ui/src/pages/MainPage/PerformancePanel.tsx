import { DonutChart } from '@mantine/charts';
import { Group, Paper, Stack, Title } from '@mantine/core';
import bytes from 'bytes';
import { FC } from 'react';
import { ResponsiveContainer } from 'recharts';

import { InstanceInfo } from '@/api/routes/instance/schemas';

interface PerformancePanelProps {
  instanceInfo: InstanceInfo;
}

export const PerformancePanel: FC<PerformancePanelProps> = ({
  instanceInfo,
}) => {
  return (
    <Paper withBorder shadow="sm" p="md">
      <Stack gap="4px">
        <Title order={4} fw="500">
          Performance
        </Title>

        <Group grow gap="xs">
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
        </Group>
      </Stack>
    </Paper>
  );
};
