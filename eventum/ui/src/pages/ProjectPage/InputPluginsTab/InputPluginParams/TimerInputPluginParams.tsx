import { Group, NumberInput, Stack, Switch, TagsInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { FC } from 'react';

import { TimerInputPluginConfig } from '@/api/routes/generator-configs/schemas/input-plugins';
import { LabelWithTooltip } from '@/components/ui/LabelWithTooltip';
import { VersatileDatetimeInput } from '@/pages/ProjectPage/VersatileDatetimeInput';

interface TimerInputPluginParamsProps {
  initialConfig: TimerInputPluginConfig;
  onChange: (config: TimerInputPluginConfig) => void;
}

export const TimerInputPluginParams: FC<TimerInputPluginParamsProps> = ({
  initialConfig,
  onChange,
}) => {
  const form = useForm<TimerInputPluginConfig>({
    initialValues: initialConfig,
    onValuesChange: (values) => onChange(values),
  });

  return (
    <Stack>
      <Group grow align="start">
        <NumberInput
          label={
            <LabelWithTooltip
              label="Seconds"
              tooltip="Number of seconds to wait before generating timestamp"
            />
          }
          suffix=" s."
          min={0.1}
          step={1}
          defaultValue={5}
          {...form.getInputProps('seconds', { type: 'input' })}
        />
        <NumberInput
          label={
            <LabelWithTooltip
              label="Count"
              tooltip=" Number of timestamps to generate"
            />
          }
          min={1}
          step={1}
          allowDecimal={false}
          defaultValue={1}
          {...form.getInputProps('count', { type: 'input' })}
        />
      </Group>
      <Switch
        label={
          <LabelWithTooltip
            label="Repeat"
            tooltip="Number of cycles to repeat, if value is not set, then repeat infinitely"
          />
        }
        {...form.getInputProps('repeat', { type: 'checkbox' })}
      />
      <VersatileDatetimeInput
        label={
          <LabelWithTooltip
            label="Start time"
            tooltip="Start time of timer countdown, if not set current time is used"
          />
        }
        placeholder="time expression"
        {...form.getInputProps('start', { type: 'input' })}
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
      <></>
    </Stack>
  );
};
