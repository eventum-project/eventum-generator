import { BarChart } from '@mantine/charts';
import { Group, Paper, Stack, Title } from '@mantine/core';
import { FC } from 'react';
import { ResponsiveContainer } from 'recharts';

import { GeneratorStats } from '@/api/routes/generators/schemas';

interface InstancesStatsPanelProps {
  generatorsStats: GeneratorStats[];
}

export const InstancesStatsPanel: FC<InstancesStatsPanelProps> = ({
  generatorsStats,
}) => {
  const dataCount = generatorsStats
    .map((stats) => ({
      id: stats.id,
      Produced: stats.event.produced,
      Written: stats.total_written,
    }))
    .sort((a, b) => b.Produced - a.Produced)
    .slice(0, 10);

  return (
    <Paper withBorder shadow="sm" p="md">
      <Stack gap="4px">
        <Title order={4} fw="500">
          Flow stats
        </Title>

        <Group grow gap="xs" mt="md">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart
              data={dataCount}
              dataKey="id"
              series={[
                { name: 'Produced', color: 'primary' },
                { name: 'Written', color: 'green.6' },
              ]}
              h="100%"
              w="100%"
            />
          </ResponsiveContainer>
        </Group>
      </Stack>
    </Paper>
  );
};
