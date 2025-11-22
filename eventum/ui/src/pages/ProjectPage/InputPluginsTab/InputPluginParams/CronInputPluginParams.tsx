import {
  Group,
  NumberInput,
  Stack,
  TagsInput,
  Text,
  TextInput,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import cronstrue from 'cronstrue';
import { FC } from 'react';

import { VersatileDatetimeInput } from '../../VersatileDatetimeInput';
import { CronInputPluginConfig } from '@/api/routes/generator-configs/schemas/plugins/input/configs/cron';
import { LabelWithTooltip } from '@/components/ui/LabelWithTooltip';

interface CronInputPluginParamsProps {
  initialConfig: CronInputPluginConfig;
  onChange: (config: CronInputPluginConfig) => void;
}

export const CronInputPluginParams: FC<CronInputPluginParamsProps> = ({
  initialConfig,
  onChange,
}) => {
  const form = useForm<CronInputPluginConfig>({
    initialValues: initialConfig,
    onValuesChange: () => {
      onChange(form.getTransformedValues());
    },
    transformValues: (values) => {
      if (values.start === '') {
        values.start = null;
      }
      if (values.end === '') {
        values.end = null;
      }

      return values;
    },
    validate: {
      expression: (value) => {
        try {
          cronstrue.toString(value);
        } catch {
          return 'Invalid expression';
        }
        return null;
      },
    },
    onSubmitPreventDefault: 'always',
    validateInputOnChange: true,
  });

  let cronDescription = '';
  try {
    cronDescription = cronstrue.toString(form.values.expression);
  } catch {
    /* empty */
  }

  return (
    <Stack>
      <Group grow align="start">
        <Stack gap="5px">
          <TextInput
            label={
              <LabelWithTooltip
                label="Expression"
                tooltip="Cron expression (supports specifying seconds, years, random
        values and keywords)"
              />
            }
            placeholder="cron expression"
            {...form.getInputProps('expression', { type: 'input' })}
          />
          <Text size="xs" c="gray.6">
            {cronDescription}
          </Text>
        </Stack>
        <NumberInput
          label={
            <LabelWithTooltip
              label="Count"
              tooltip="Number of timestamps to generate for every cron interval"
            />
          }
          min={1}
          step={1}
          allowDecimal={false}
          {...form.getInputProps('count', { type: 'input' })}
        />
      </Group>
      <Group grow align="start">
        <VersatileDatetimeInput
          label={
            <LabelWithTooltip
              label="Start time"
              tooltip="Start of the generating date range, if not set, current time is used"
            />
          }
          placeholder="time expression"
          {...form.getInputProps('start', { type: 'input' })}
        />
        <VersatileDatetimeInput
          label={
            <LabelWithTooltip
              label="End time"
              tooltip="End time of the generating date range, if not set, then never end generation."
            />
          }
          placeholder="time expression"
          {...form.getInputProps('end', { type: 'input' })}
        />
      </Group>
      <TagsInput
        label={
          <LabelWithTooltip
            label="Tags"
            tooltip="Tags list attached to an input plugin"
          />
        }
        placeholder="Press Enter to submit a tag"
        {...form.getInputProps('tags', { type: 'input' })}
      />
    </Stack>
  );
};
