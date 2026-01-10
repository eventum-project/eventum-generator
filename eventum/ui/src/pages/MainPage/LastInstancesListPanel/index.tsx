import {
  Anchor,
  Divider,
  Group,
  Paper,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconFolder } from '@tabler/icons-react';
import { dirname } from 'pathe';
import { FC } from 'react';

import { InstanceStatus } from './InstanceStatus';
import { GeneratorsInfo } from '@/api/routes/generators/schemas';
import { ROUTE_PATHS } from '@/routing/paths';

interface LastInstancesListPanelProps {
  generators: GeneratorsInfo;
}

export const LastInstancesListPanel: FC<LastInstancesListPanelProps> = ({
  generators,
}) => {
  const sortedGenerators = [...generators]
    .sort(
      (a, b) =>
        Date.parse(b.start_time ?? '1970') - Date.parse(a.start_time ?? '1970')
    )
    .slice(0, 5);

  return (
    <Paper withBorder shadow="sm" p="md">
      <Stack gap="sm">
        <Title order={4} fw="500">
          Recent instances
        </Title>

        <Stack gap="sm">
          {sortedGenerators.map((generator) => (
            <Stack key={generator.id} gap="0">
              <Group justify="end">
                {generator.start_time && (
                  <Text size="sm" c="gray.6">
                    {new Date(generator.start_time).toLocaleString()}
                  </Text>
                )}
              </Group>
              <Paper key={generator.id} withBorder p="xs" shadow="0">
                <Stack gap="xs">
                  <Stack gap="4px">
                    <Group justify="space-between">
                      <Anchor
                        size="sm"
                        fw="bold"
                        href={`${ROUTE_PATHS.INSTANCES}/${generator.id}`}
                      >
                        {generator.id}
                      </Anchor>

                      <InstanceStatus status={generator.status} />
                    </Group>

                    <Divider />
                  </Stack>

                  <Group gap="xs">
                    <IconFolder size={20} />
                    <Anchor
                      size="sm"
                      href={`${ROUTE_PATHS.PROJECTS}/${dirname(generator.path)}`}
                    >
                      {dirname(generator.path)}
                    </Anchor>
                  </Group>
                </Stack>
              </Paper>
            </Stack>
          ))}
        </Stack>
      </Stack>
    </Paper>
  );
};
