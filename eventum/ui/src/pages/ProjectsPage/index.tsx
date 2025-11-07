import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Center,
  Container,
  Group,
  Loader,
  TagsInput,
  TextInput,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconAlertSquareRounded, IconSearch, IconX } from '@tabler/icons-react';
import { useState } from 'react';

import { CreateProjectModal } from './CreateProjectModal';
import { GeneratorDirsTable } from './GeneratorDirsTable';
import { useGeneratorDirs } from '@/api/hooks/useGeneratorConfigs';
import { ShowErrorDetailsAnchor } from '@/components/ui/ShowErrorDetailsAnchor';

export default function ProjectsPage() {
  const [
    isCreateModalOpened,
    { open: openCreateModal, close: closeCreateModal },
  ] = useDisclosure(false);

  const [projectNameFilter, setProjectNameFilter] = useState('');
  const [instanceFilter, setInstanceFilter] = useState<string[]>([]);

  const {
    data: generatorDirs,
    isLoading: isGeneratorDirsLoading,
    isError: isGeneratorDirsError,
    error: generatorDirsError,
    isSuccess: isGeneratorDirsSuccess,
  } = useGeneratorDirs();

  if (isGeneratorDirsLoading) {
    return (
      <Center>
        <Loader size="lg" />
      </Center>
    );
  }

  if (isGeneratorDirsError) {
    return (
      <Container size="md" mt="lg">
        <Alert
          variant="default"
          icon={<Box c="red" component={IconAlertSquareRounded}></Box>}
          title="Failed to load projects list"
        >
          {generatorDirsError.message}
          <ShowErrorDetailsAnchor error={generatorDirsError} prependDot />
        </Alert>
      </Container>
    );
  }

  if (isGeneratorDirsSuccess) {
    const uniqueInstances = new Set(
      generatorDirs.flatMap((item) => item.generator_ids)
    );

    return (
      <Container size="100%" mt="lg">
        <CreateProjectModal
          opened={isCreateModalOpened}
          onClose={closeCreateModal}
        />

        <Group justify="space-between">
          <Group>
            <TextInput
              leftSection={<IconSearch size={16} />}
              rightSection={
                <ActionIcon
                  variant="transparent"
                  onClick={() => setProjectNameFilter('')}
                  data-input-section
                >
                  <IconX size={16} />
                </ActionIcon>
              }
              placeholder="search by name..."
              value={projectNameFilter}
              onChange={(event) => setProjectNameFilter(event.target.value)}
            />
            <TagsInput
              placeholder="search by instance"
              clearable
              data={[...uniqueInstances].sort((a, b) => a.localeCompare(b))}
              value={instanceFilter}
              onChange={(values) => setInstanceFilter(values)}
            />
          </Group>
          <Button onClick={openCreateModal}>Create new</Button>
        </Group>

        <GeneratorDirsTable
          data={generatorDirs}
          projectNameFilter={projectNameFilter}
          instancesFilter={instanceFilter}
        />
      </Container>
    );
  }

  return <></>;
}
