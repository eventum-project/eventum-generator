import { Button, Group, Stack, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { FC } from 'react';

import { TemplateConfigForGeneralModes } from '@/api/routes/generator-configs/schemas/plugins/event/configs/template';

interface AddTemplateModalProps {
  existingTemplates: string[];
  existingFiles: string[];
  onAdd: (
    templateName: string,
    templatePath: string,
    templateConfig: TemplateConfigForGeneralModes
  ) => void;
}

const filePathPattern = /^[^*"<>|?:\\]+$/;

export const AddTemplateModal: FC<AddTemplateModalProps> = ({
  existingTemplates,
  existingFiles,
  onAdd,
}) => {
  const internalForm = useForm<{ templateName: string; filePath: string }>({
    initialValues: {
      templateName: '',
      filePath: '',
    },
    validate: {
      templateName: (value) => {
        if (value === '') {
          return 'Template name is required';
        }

        if (existingTemplates.includes(value)) {
          return 'Template with this name already exists';
        }

        return null;
      },
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

        if (!value.endsWith('.jinja')) {
          return 'File extension must be .jinja';
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

  function handleAddTemplate(values: typeof internalForm.values) {
    onAdd(values.templateName, values.filePath, { template: values.filePath });
  }

  return (
    <form onSubmit={internalForm.onSubmit(handleAddTemplate)}>
      <Stack>
        <TextInput
          label="Template name"
          placeholder="name"
          {...internalForm.getInputProps('templateName')}
        />
        <TextInput
          label="File path"
          placeholder="path"
          {...internalForm.getInputProps('filePath')}
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
