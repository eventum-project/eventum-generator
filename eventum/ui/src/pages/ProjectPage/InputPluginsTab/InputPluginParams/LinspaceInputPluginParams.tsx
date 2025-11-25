import { Group, NumberInput, Stack, Switch, TagsInput } from '@mantine/core';
import { isNotEmpty, useForm } from '@mantine/form';
import { FC } from 'react';

import { VersatileDatetimeInput } from '../../VersatileDatetimeInput';
import { LinspaceInputPluginConfig } from '@/api/routes/generator-configs/schemas/plugins/input/configs/linspace';
import { LabelWithTooltip } from '@/components/ui/LabelWithTooltip';

interface LinspaceInputPluginParamsProps {
  initialConfig: LinspaceInputPluginConfig;
  onChange: (config: LinspaceInputPluginConfig) => void;
}

export const LinspaceInputPluginParams: FC<LinspaceInputPluginParamsProps> = ({
  initialConfig,
  onChange,
}) => {
  const form = useForm<LinspaceInputPluginConfig>({
    initialValues: initialConfig,
    onValuesChange: (values) => {
      onChange(values);
    },
    validate: {
      start: isNotEmpty('Start time is required'),
      end: isNotEmpty('End time is required'),
    },
    onSubmitPreventDefault: 'always',
    validateInputOnChange: true,
  });

  return (
    <Stack>
      <Group grow align="start">
        <VersatileDatetimeInput
          label={
            <LabelWithTooltip
              label="Start time"
              tooltip="Start time of the generating date range."
            />
          }
          placeholder="time expression"
          {...form.getInputProps('start', { type: 'input' })}
        />
        <VersatileDatetimeInput
          label={
            <LabelWithTooltip
              label="End time"
              tooltip="End time of the generating date range."
            />
          }
          placeholder="time expression"
          {...form.getInputProps('end', { type: 'input' })}
        />
      </Group>

      <NumberInput
        label={
          <LabelWithTooltip
            label="Count"
            tooltip="Number of events within date range."
          />
        }
        min={1}
        step={1}
        allowDecimal={false}
        {...form.getInputProps('count', { type: 'input' })}
      />

      <Switch
        label={
          <LabelWithTooltip
            label="Include end point"
            tooltip="Whether to include end point of date range."
          />
        }
        {...form.getInputProps('endpoint', { type: 'checkbox' })}
      />

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
