import { Button, Group, Stack, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { FC } from 'react';

interface CreateItemModalProps {
  onCreate: (filepath: string) => void;
  isLoading: boolean;
}

export const CreateItemModal: FC<CreateItemModalProps> = ({
  onCreate,
  isLoading,
}) => {
  const form = useForm<{ filepath: string }>({
    initialValues: {
      filepath: '',
    },
    onSubmitPreventDefault: 'always',
  });

  return (
    <form onSubmit={form.onSubmit((values) => onCreate(values.filepath))}>
      <Stack>
        <TextInput
          label="Path"
          placeholder="path"
          disabled={isLoading}
          description="Nested paths are allowed, intermediate dirs are autocreated"
          {...form.getInputProps('filepath')}
        />
        <Group justify="end">
          <Button type="submit" loading={isLoading}>
            Create
          </Button>
        </Group>
      </Stack>
    </form>
  );
};
