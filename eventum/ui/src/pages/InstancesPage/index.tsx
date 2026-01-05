import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Center,
  Checkbox,
  Container,
  Group,
  Loader,
  TextInput,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import {
  IconAlertSquareRounded,
  IconRefresh,
  IconSearch,
  IconX,
} from '@tabler/icons-react';
import { useState } from 'react';

import { CreateInstanceModal } from './CreateInstanceModal';
import { InstancesTable } from './InstancesTable';
import { useGenerators } from '@/api/hooks/useGenerators';
import { PageTitle } from '@/components/ui/PageTitle';
import { ShowErrorDetailsAnchor } from '@/components/ui/ShowErrorDetailsAnchor';

export default function InstancesPage() {
  const [instanceFilter, setInstanceFilter] = useState('');
  const [projectNameFilter, setProjectNameFilter] = useState('');
  const [runningOnlyFilter, setRunningOnlyFilter] = useState(false);

  const {
    data: generators,
    isLoading: isGeneratorsLoading,
    isError: isGeneratorsError,
    error: generatorsError,
    isSuccess: isGeneratorsSuccess,
    refetch: refetchGenerators,
  } = useGenerators();

  if (isGeneratorsLoading) {
    return (
      <Center>
        <Loader size="lg" />
      </Center>
    );
  }

  if (isGeneratorsError) {
    return (
      <Container size="md" mt="lg">
        <PageTitle title="Instances" />
        <Alert
          variant="default"
          icon={<Box c="red" component={IconAlertSquareRounded}></Box>}
          title="Failed to load instances list"
        >
          {generatorsError.message}
          <ShowErrorDetailsAnchor error={generatorsError} prependDot />
        </Alert>
      </Container>
    );
  }

  if (isGeneratorsSuccess) {
    return (
      <Container size="100%">
        <PageTitle title="Instances" />
        <Group justify="space-between" mt="lg">
          <Group>
            <TextInput
              leftSection={<IconSearch size={16} />}
              rightSection={
                <ActionIcon
                  variant="transparent"
                  onClick={() => setInstanceFilter('')}
                  data-input-section
                >
                  <IconX size={16} />
                </ActionIcon>
              }
              placeholder="search by instance..."
              value={instanceFilter}
              onChange={(event) => setInstanceFilter(event.target.value)}
            />
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
              placeholder="search by project..."
              value={projectNameFilter}
              onChange={(event) => setProjectNameFilter(event.target.value)}
            />
            <Checkbox
              label="Running only"
              checked={runningOnlyFilter}
              onChange={(event) =>
                setRunningOnlyFilter(event.currentTarget.checked)
              }
            />
          </Group>
          <Group gap="xs">
            <ActionIcon
              size="lg"
              variant="default"
              title="Refresh table"
              onClick={() => void refetchGenerators()}
              loading={isGeneratorsLoading}
            >
              <IconRefresh size={20} />
            </ActionIcon>
            <Button
              onClick={() =>
                modals.open({
                  title: 'New instance',
                  children: (
                    <CreateInstanceModal
                      existingInstanceIds={generators.map(
                        (instance) => instance.id
                      )}
                    />
                  ),
                  size: 'lg',
                })
              }
            >
              Create new
            </Button>
          </Group>
        </Group>

        <InstancesTable
          data={generators}
          projectNameFilter={projectNameFilter}
          instancesFilter={instanceFilter}
          runningOnlyFilter={runningOnlyFilter}
        />
      </Container>
    );
  }

  return <></>;
}
