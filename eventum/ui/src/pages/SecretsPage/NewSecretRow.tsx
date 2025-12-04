import { ActionIcon, Group, Table, TextInput } from '@mantine/core';
import { isNotEmpty, useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconDeviceFloppy } from '@tabler/icons-react';
import { FC, useState } from 'react';

import { useSetSecretValueMutation } from '@/api/hooks/useSecrets';
import { ShowErrorDetailsAnchor } from '@/components/ui/ShowErrorDetailsAnchor';

export const NewSecretRow: FC = () => {
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

  const updateSecretValue = useSetSecretValueMutation();
  const [isSettingNewSecret, setSettingNewSecret] = useState(false);

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

  return (
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
  );
};
