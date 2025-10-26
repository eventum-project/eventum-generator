import {
  Alert,
  Box,
  Button,
  Center,
  Divider,
  Group,
  Loader,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import {
  IconAlertSquareRounded,
  IconBox,
  IconBrandPython,
  IconServer,
} from '@tabler/icons-react';
import { FC } from 'react';

import { useInstanceInfo } from '@/api/hooks/useInstance';
import { ResponsibleCopyButton } from '@/components/ui/ResponsibleCopyButton';

export const AboutModal: FC = () => {
  const {
    data: instanceInfo,
    isLoading: isInstanceInfoLoading,
    isSuccess: isInstanceInfoSuccess,
    isError: isInstanceInfoError,
    error: instanceInfoError,
  } = useInstanceInfo();

  if (isInstanceInfoLoading) {
    return (
      <Center>
        <Loader />
      </Center>
    );
  }

  if (isInstanceInfoError) {
    return (
      <Alert
        mt="md"
        variant="default"
        icon={<Box c="red" component={IconAlertSquareRounded}></Box>}
        title="Failed to get instance information"
      >
        {instanceInfoError.message}
      </Alert>
    );
  }

  if (isInstanceInfoSuccess) {
    return (
      <Stack>
        {[
          {
            sectionName: 'Application',
            icon: IconBox,
            sectionItems: [
              { label: 'Version', value: instanceInfo.app_version },
            ],
          },
          {
            sectionName: 'Python',
            icon: IconBrandPython,
            sectionItems: [
              { label: 'Version', value: instanceInfo.python_version },
              {
                label: 'Implementation',
                value: instanceInfo.python_implementation,
              },
              { label: 'Compiler', value: instanceInfo.python_compiler },
            ],
          },
          {
            sectionName: 'Server',
            icon: IconServer,
            sectionItems: [
              {
                label: 'Platform',
                value: instanceInfo.platform,
              },
              {
                label: 'Boot time',
                value: new Date(
                  instanceInfo.boot_timestamp * 1000
                ).toLocaleString(),
              },
            ],
          },
        ].map((section, index, arr) => (
          <Stack key={section.sectionName}>
            <Group mt="sm" gap="xs">
              <section.icon size="19px" />
              <Title order={6} fw={600}>
                {section.sectionName}
              </Title>
            </Group>
            {
              <Stack gap="xs">
                {section.sectionItems.map((sectionItem) => (
                  <Group key={sectionItem.label}>
                    <Text size="sm">
                      {sectionItem.label}: {sectionItem.value}
                    </Text>
                  </Group>
                ))}
              </Stack>
            }
            {index < arr.length - 1 ? <Divider /> : <></>}
          </Stack>
        ))}
        <Group justify="flex-end" mt="xs" gap="xs">
          <ResponsibleCopyButton
            content={JSON.stringify(instanceInfo, undefined, 2)}
            label="Copy full info"
            tooltipPosition="left"
            size="lg"
          />
          <Button onClick={() => modals.closeAll()} variant="default">
            Close
          </Button>
        </Group>
      </Stack>
    );
  }

  return <></>;
};
