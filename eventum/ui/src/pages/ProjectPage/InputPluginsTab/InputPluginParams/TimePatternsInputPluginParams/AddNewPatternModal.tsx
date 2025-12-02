import { Button, Group, Stack, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { FC } from 'react';
import YAML from 'yaml';

import { useUploadGeneratorFileMutation } from '@/api/hooks/useGeneratorConfigs';
import { TimePatternConfig } from '@/api/routes/generator-configs/schemas/plugins/input/configs/time_patterns';
import { ShowErrorDetailsAnchor } from '@/components/ui/ShowErrorDetailsAnchor';
import { useProjectName } from '@/pages/ProjectPage/hooks/useProjectName';

interface AddNewPatternModalProps {
  existingFiles: string[];
  onAddNewPattern: (filePath: string) => void;
}

const filePathPattern = /^[^*"<>|?:\\]+$/;

const defaultTimePatternContent = YAML.stringify({
  label: 'Time pattern description',
  oscillator: {
    start: '00:00',
    end: 'never',
    period: 1,
    unit: 'days',
  },
  multiplier: {
    ratio: 1000,
  },
  randomizer: {
    deviation: 0.25,
    direction: 'mixed',
    sampling: 1024,
  },
  spreader: {
    distribution: 'beta',
    parameters: {
      a: 15,
      b: 15,
    },
  },
} as TimePatternConfig);

export const AddNewPatternModal: FC<AddNewPatternModalProps> = ({
  existingFiles,
  onAddNewPattern,
}) => {
  const form = useForm<{ filePath: string }>({
    initialValues: {
      filePath: '',
    },
    validate: {
      filePath: (value) => {
        if (value === '') {
          return 'File path is required';
        }

        if (
          existingFiles
            .map((item) => item.replace(/^\.\//, ''))
            .includes(value.replace(/^\.\//, ''))
        ) {
          return 'File already exists';
        }

        if (!(value.endsWith('.yaml') || value.endsWith('.yml'))) {
          return 'File extension must be .yaml or .yml';
        }

        if (!filePathPattern.test(value)) {
          return 'File path contains forbidden characters';
        }

        return null;
      },
    },
    validateInputOnChange: true,
    onSubmitPreventDefault: 'always',
  });

  const uploadFile = useUploadGeneratorFileMutation();

  const { projectName } = useProjectName();

  function handleAddFile(values: typeof form.values) {
    uploadFile.mutate(
      {
        name: projectName,
        filepath: values.filePath,
        content: defaultTimePatternContent,
      },
      {
        onSuccess: (_, { filepath }) => {
          onAddNewPattern(filepath);
          modals.closeAll();
        },
        onError: (error) => {
          notifications.show({
            title: 'Error',
            message: (
              <>
                Failed to add time pattern
                <ShowErrorDetailsAnchor error={error} prependDot />
              </>
            ),
            color: 'red',
          });
        },
      }
    );
  }

  return (
    <form onSubmit={form.onSubmit(handleAddFile)}>
      <Stack>
        <TextInput
          label="File location"
          placeholder="relative file path"
          {...form.getInputProps('filePath', { type: 'input' })}
        />
        <Group justify="end">
          <Button disabled={!form.isValid()} type="submit">
            Add
          </Button>
        </Group>
      </Stack>
    </form>
  );
};
