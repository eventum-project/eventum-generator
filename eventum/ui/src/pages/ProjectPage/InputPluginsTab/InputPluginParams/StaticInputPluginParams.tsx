import { NumberInput, Stack, TagsInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { FC } from 'react';

import { StaticInputPluginConfig } from '@/api/routes/generator-configs/schemas/plugins/input/configs/static';
import { LabelWithTooltip } from '@/components/ui/LabelWithTooltip';

interface StaticInputPluginParamsProps {
  initialConfig: StaticInputPluginConfig;
  onChange: (config: StaticInputPluginConfig) => void;
}

export const StaticInputPluginParams: FC<StaticInputPluginParamsProps> = ({
  initialConfig,
  onChange,
}) => {
  const form = useForm<StaticInputPluginConfig>({
    initialValues: initialConfig,
    onValuesChange: (values) => {
      onChange(values);
    },
    onSubmitPreventDefault: 'always',
    validateInputOnChange: true,
  });

  return (
    <Stack>
      <NumberInput
        label={
          <LabelWithTooltip
            label="Count"
            tooltip="Number of events to generate."
          />
        }
        min={1}
        step={1}
        allowDecimal={false}
        {...form.getInputProps('count', { type: 'input' })}
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
