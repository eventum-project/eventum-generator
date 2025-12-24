import {
  Anchor,
  Group,
  NumberInput,
  Select,
  Stack,
  Switch,
  TextInput,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { zod4Resolver } from 'mantine-form-zod-resolver';
import { FC } from 'react';

import { ENCODINGS } from '@/api/routes/generator-configs/schemas/encodings';
import {
  ReplayEventPluginConfig,
  ReplayEventPluginConfigSchema,
} from '@/api/routes/generator-configs/schemas/plugins/event/configs/replay';
import { LabelWithTooltip } from '@/components/ui/LabelWithTooltip';
import { ProjectFileSelect } from '@/pages/ProjectPage/components/ProjectFileSelect';

interface ReplayEventPluginParamsProps {
  initialConfig: ReplayEventPluginConfig;
  onChange: (config: ReplayEventPluginConfig) => void;
}

export const ReplayEventPluginParams: FC<ReplayEventPluginParamsProps> = ({
  initialConfig,
  onChange,
}) => {
  const form = useForm<ReplayEventPluginConfig>({
    initialValues: initialConfig,
    validate: zod4Resolver(ReplayEventPluginConfigSchema),
    transformValues: (values) => {
      const newValues = { ...values };

      if (!values.timestamp_pattern) {
        newValues.timestamp_pattern = undefined;
      }
      if (!values.timestamp_format) {
        newValues.timestamp_format = undefined;
      }
      if (!values.chunk_size) {
        newValues.chunk_size = undefined;
      }
      if (!values.encoding) {
        newValues.encoding = undefined;
      }

      return newValues;
    },
    onValuesChange: () => {
      onChange(form.getTransformedValues());
    },
    onSubmitPreventDefault: 'always',
    validateInputOnChange: true,
  });

  return (
    <Stack>
      <ProjectFileSelect
        label={
          <LabelWithTooltip label="Path" tooltip="Path to log file to replay" />
        }
        placeholder="path"
        clearable
        searchable
        {...form.getInputProps('path')}
      />
      <TextInput
        label={
          <Group gap="xs">
            <LabelWithTooltip
              label="Timestamp pattern"
              tooltip="Regular expression pattern to identify the timestamp
                  substitution position within the original message. The
                  substitution is performed over the named group `timestamp`.
                  If value is not set or pattern does not match, then substitution
                  is not performed. Regular expression must be specified in Python regex dialect."
            />
            <Anchor
              size="sm"
              target="_blank"
              href="https://docs.python.org/3/library/re.html#regular-expression-syntax"
            >
              Regex syntax
            </Anchor>
          </Group>
        }
        placeholder="regular expression"
        value={form.getValues().timestamp_pattern ?? undefined}
        onChange={(event) => {
          form.setFieldValue(
            'timestamp_pattern',
            event.currentTarget.value.length > 0
              ? event.currentTarget.value
              : undefined
          );
        }}
        error={form.errors.timestamp_pattern}
      />
      <TextInput
        label={
          <Group>
            <LabelWithTooltip
              label="Timestamp format"
              tooltip="Format string that defines how the actual timestamp should be substituted
                  in the log message. The format follows C89 standard. If value is not set, then
                  default (ISO 8601) format is used."
            />
            <Anchor
              size="sm"
              target="_blank"
              href="https://docs.python.org/3/library/datetime.html#strftime-and-strptime-format-codes"
            >
              C89 format
            </Anchor>
          </Group>
        }
        placeholder="format string"
        value={form.getValues().timestamp_format ?? undefined}
        onChange={(event) => {
          form.setFieldValue(
            'timestamp_format',
            event.currentTarget.value.length > 0
              ? event.currentTarget.value
              : undefined
          );
        }}
        error={form.errors.timestamp_format}
      />
      <Switch
        label={
          <LabelWithTooltip
            label="Repeat"
            tooltip="Whether to repeat replaying after the end of file is reached."
          />
        }
        {...form.getInputProps('repeat', { type: 'checkbox' })}
      />
      <NumberInput
        label={
          <LabelWithTooltip
            label="Chunk size"
            tooltip="Number of bytes to read from the file at a time. This parameter
                controls how often to access file and how many data will be
                stored in in memory. If 0 is provided then the entire file is
                read at once. Default is 1 MiB."
          />
        }
        min={0}
        allowDecimal={false}
        placeholder="bytes"
        value={form.getValues().chunk_size ?? undefined}
        onChange={(value) => {
          form.setFieldValue(
            'chunk_size',
            typeof value === 'number' ? value : undefined
          );
        }}
        error={form.errors.chunk_size}
      />
      <Select
        label={
          <LabelWithTooltip
            label="Encoding"
            tooltip="Encoding of the log file. Default is UTF-8."
          />
        }
        placeholder="encoding"
        data={ENCODINGS}
        clearable
        searchable
        {...form.getInputProps('encoding')}
      />
    </Stack>
  );
};
