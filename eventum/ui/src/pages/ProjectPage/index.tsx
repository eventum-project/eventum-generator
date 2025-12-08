import {
  Alert,
  Anchor,
  Box,
  Button,
  Center,
  Container,
  Group,
  Loader,
  Stack,
  Tabs,
  Text,
  Title,
} from '@mantine/core';
import {
  IconAlertSquareRounded,
  IconArrowLeft,
  IconArrowsSplit2,
  IconClockPlay,
  IconCube,
  IconFiles,
} from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';

import { EventPluginTab } from './EventPluginTab';
import { InputPluginsTab } from './InputPluginsTab';
import { ProjectNameProvider } from './context/ProjectNameContext';
import { useGeneratorConfig } from '@/api/hooks/useGeneratorConfigs';
import { ShowErrorDetailsAnchor } from '@/components/ui/ShowErrorDetailsAnchor';
import { ROUTE_PATHS } from '@/routing/paths';

export default function ProjectPage() {
  const { projectName } = useParams() as { projectName: string };
  const navigate = useNavigate();

  const {
    data: generatorConfig,
    isSuccess: isGeneratorConfigSuccess,
    isError: isGeneratorConfigError,
    error: generatorConfigError,
    isLoading: isGeneratorConfigLoading,
  } = useGeneratorConfig(projectName);

  if (isGeneratorConfigLoading) {
    return (
      <Center>
        <Loader size="lg" />
      </Center>
    );
  }

  if (isGeneratorConfigError) {
    return (
      <Container size="md">
        <Alert
          variant="default"
          icon={<Box c="red" component={IconAlertSquareRounded}></Box>}
          title="Failed to open project"
        >
          {generatorConfigError.message}
          <ShowErrorDetailsAnchor error={generatorConfigError} prependDot />
          <Anchor onClick={() => void navigate(ROUTE_PATHS.PROJECTS)}>
            <Text size="sm" ta="end">
              ← Go Back
            </Text>
          </Anchor>
        </Alert>
      </Container>
    );
  }

  if (isGeneratorConfigSuccess) {
    return (
      <ProjectNameProvider initialProjectName={projectName}>
        <Container size="100%" mt="xs">
          <Stack>
            <Group justify="space-between">
              <Title order={3} fw="normal">
                {projectName}
              </Title>
              <Group>
                <Button
                  variant="default"
                  leftSection={<IconArrowLeft size={16} />}
                  onClick={() => void navigate(ROUTE_PATHS.PROJECTS)}
                >
                  Back
                </Button>
                <Button>Save</Button>
              </Group>
            </Group>
            <Tabs defaultValue="input" mt="lg">
              <Tabs.List>
                <Tabs.Tab
                  value="input"
                  leftSection={<IconClockPlay size={14} />}
                >
                  Input plugins
                </Tabs.Tab>
                <Tabs.Tab value="event" leftSection={<IconCube size={14} />}>
                  Event plugin
                </Tabs.Tab>
                <Tabs.Tab
                  value="output"
                  leftSection={<IconArrowsSplit2 size={14} />}
                >
                  Output plugins
                </Tabs.Tab>
                <Tabs.Tab value="assets" leftSection={<IconFiles size={14} />}>
                  Assets
                </Tabs.Tab>
              </Tabs.List>

              <Box mt="md">
                <Tabs.Panel value="input">
                  <InputPluginsTab inputPluginsConfig={generatorConfig.input} />
                </Tabs.Panel>
                <Tabs.Panel value="event">
                  <EventPluginTab eventPluginConfig={generatorConfig.event} />
                </Tabs.Panel>
                <Tabs.Panel value="output">Output plugins</Tabs.Panel>
                <Tabs.Panel value="assets">Assets</Tabs.Panel>
              </Box>
            </Tabs>
          </Stack>
        </Container>
      </ProjectNameProvider>
    );
  }

  return <></>;
}
