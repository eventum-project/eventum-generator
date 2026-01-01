import { Button, Group, Stack, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { FC } from 'react';

import {
  SampleConfig,
  SampleType,
} from '@/api/routes/generator-configs/schemas/plugins/event/configs/template';

interface AddSampleModalProps {
  existingSamples: string[];
  onAdd: (sampleName: string, sampleConfig: SampleConfig) => void;
}

export const AddSampleModal: FC<AddSampleModalProps> = ({
  existingSamples,
  onAdd,
}) => {
  const internalForm = useForm<{ sampleName: string }>({
    initialValues: {
      sampleName: '',
    },
    validate: {
      sampleName: (value) => {
        if (value === '') {
          return 'Sample name is required';
        }

        if (existingSamples.includes(value)) {
          return 'Sample with this name already exists';
        }

        return null;
      },
    },
    validateInputOnChange: true,
    onSubmitPreventDefault: 'always',
  });

  function handleAddSample(values: typeof internalForm.values) {
    onAdd(values.sampleName, {
      type: SampleType.Items,
      source: ['item1', 'item2', 'item3'],
    });
  }

  return (
    <form onSubmit={internalForm.onSubmit(handleAddSample)}>
      <Stack>
        <TextInput
          label="Sample name"
          placeholder="name"
          {...internalForm.getInputProps('sampleName')}
        />
        <Group justify="end">
          <Button disabled={!internalForm.isValid()} type="submit">
            Add
          </Button>
        </Group>
      </Stack>
    </form>
  );
};
