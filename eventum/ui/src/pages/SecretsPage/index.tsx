import {
  ActionIcon,
  Alert,
  Box,
  Center,
  Container,
  Group,
  Loader,
  Table,
  TextInput,
} from '@mantine/core';
import { isNotEmpty, useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconAlertSquareRounded, IconDeviceFloppy } from '@tabler/icons-react';
import { useState } from 'react';

import { TableRow } from './TableRow';
import {
  useSecretNames,
  useSetSecretValueMutation,
} from '@/api/hooks/useSecrets';
import { ShowErrorDetailsAnchor } from '@/components/ui/ShowErrorDetailsAnchor';

export default function SecretsPage() {
  const {
    data: secretNames,
    isLoading: isSecretNamesLoading,
    isError: isSecretNamesError,
    error: secretNamesError,
    isSuccess: isSecretNamesSuccess,
  } = useSecretNames();

  const updateSecretValue = useSetSecretValueMutation();
  const [isSettingNewSecret, setSettingNewSecret] = useState(false);

  const form = useForm<{ name: string; value: string }>({
    initialValues: {
      name: '',
      value: '',
    },
    validate: {
      name: isNotEmpty('Name is required'),
      value: isNotEmpty('Value is required'),
    },
    validateInputOnChange: true,
    onSubmitPreventDefault: 'always',
  });

  function handleSetNewSecret(values: typeof form.values) {
    setSettingNewSecret(true);
    updateSecretValue.mutate(
      { name: values.name, value: values.value },
      {
        onError: (error) => {
          setSettingNewSecret(false);
          notifications.show({
            title: 'Error',
            message: (
              <>
                Failed to add new secret.{' '}
                <ShowErrorDetailsAnchor error={error} />
              </>
            ),
            color: 'red',
          });
        },
        onSuccess: () => {
          setSettingNewSecret(false);
          form.reset();
          notifications.show({
            title: 'Success',
            message: 'New secret was added',
            color: 'green',
          });
        },
      }
    );
  }

  if (isSecretNamesLoading) {
    return (
      <Center>
        <Loader size="lg" />
      </Center>
    );
  }

  if (isSecretNamesError) {
    return (
      <Container size="md" mt="lg">
        <Alert
          variant="default"
          icon={<Box c="red" component={IconAlertSquareRounded}></Box>}
          title="Failed to load list of secrets"
        >
          {secretNamesError.message}
          <ShowErrorDetailsAnchor error={secretNamesError} prependDot />
        </Alert>
      </Container>
    );
  }

  if (isSecretNamesSuccess) {
    return (
      <Container size="lg" mt="lg" mb="400px">
        <Table mt="md" highlightOnHover stickyHeader stickyHeaderOffset={60}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Value</Table.Th>
              <Table.Th style={{ width: '1%', whiteSpace: 'nowrap' }}>
                Actions
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {secretNames.map((item) => (
              <TableRow key={item} name={item} />
            ))}
            <Table.Tr style={{ verticalAlign: 'top' }}>
              <Table.Td>
                <TextInput
                  placeholder="new secret name"
                  {...form.getInputProps('name')}
                  size="sm"
                />
              </Table.Td>
              <Table.Td>
                <TextInput
                  placeholder="secret value"
                  {...form.getInputProps('value')}
                />
              </Table.Td>

              <Table.Td>
                <Group gap="xs">
                  <ActionIcon
                    variant="transparent"
                    title="Save"
                    size="lg"
                    onClick={() => handleSetNewSecret(form.values)}
                    disabled={!form.isValid() || isSettingNewSecret}
                  >
                    <IconDeviceFloppy size={20} />
                  </ActionIcon>
                </Group>
              </Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>
      </Container>
    );
  }

  return <></>;
}
