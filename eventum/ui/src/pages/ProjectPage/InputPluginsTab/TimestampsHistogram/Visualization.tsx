import { BarChart } from '@mantine/charts';
import { CodeHighlight } from '@mantine/code-highlight';
import { Box, Group, Stack, Tabs, Text } from '@mantine/core';
import { FC, memo } from 'react';
import { ResponsiveContainer } from 'recharts';

import { HistogramData, HistogramSeries } from '.';

interface VisualizationProps {
  histogramData: HistogramData;
  histogramSeries: HistogramSeries;
  totalCount: number;
  timestampsList: string;
}

const Visualization: FC<VisualizationProps> = ({
  histogramData,
  histogramSeries,
  totalCount,
  timestampsList,
}) => {
  return (
    <Tabs defaultValue="histogram">
      <Tabs.List>
        <Tabs.Tab value="histogram">Distribution histogram</Tabs.Tab>
        <Tabs.Tab value="timestamps">Timestamps</Tabs.Tab>
      </Tabs.List>

      <Box mt="xs">
        <Tabs.Panel value="histogram">
          <Stack gap="0">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                h="100%"
                w="100%"
                data={histogramData}
                dataKey="timestamp"
                type="stacked"
                series={histogramSeries}
                xAxisLabel="Time"
                yAxisLabel="Count"
                withLegend
              />
            </ResponsiveContainer>

            <Group justify="end">
              <Text size="sm" c="gray.6">
                Total count: {totalCount}
              </Text>
            </Group>
          </Stack>
        </Tabs.Panel>
      </Box>
      <Tabs.Panel value="timestamps">
        <CodeHighlight
          code={timestampsList}
          language="json"
          withExpandButton
          defaultExpanded={false}
          expandCodeLabel="Expand"
          collapseCodeLabel="Collapse"
        />
      </Tabs.Panel>
    </Tabs>
  );
};

export default memo(Visualization);
