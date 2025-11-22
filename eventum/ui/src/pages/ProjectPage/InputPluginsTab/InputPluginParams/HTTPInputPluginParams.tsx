import { Group, NumberInput, Stack, TagsInput, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { FC } from 'react';
import validator from 'validator';

import { HTTPInputPluginConfig } from '@/api/routes/generator-configs/schemas/plugins/input/configs/http';
import { LabelWithTooltip } from '@/components/ui/LabelWithTooltip';

interface HTTPInputPluginParamsProps {
  initialConfig: HTTPInputPluginConfig;
  onChange: (config: HTTPInputPluginConfig) => void;
}

export const HTTPInputPluginParams: FC<HTTPInputPluginParamsProps> = ({
  initialConfig,
  onChange,
}) => {
  const form = useForm<HTTPInputPluginConfig>({
    initialValues: initialConfig,
    onValuesChange: () => {
      onChange(form.getTransformedValues());
    },
    transformValues: (values) => {
      if (values.host === '') {
        values.host = undefined;
      }

      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      if (!values.max_pending_requests) {
        values.max_pending_requests = undefined;
      }

      return values;
    },
    validate: {
      host: (value) => {
        if (value && value !== '') {
          if (
            validator.isIP(value) ||
            validator.isFQDN(value, {
              require_tld: false,
              allow_underscores: true,
            })
          ) {
            return null;
          } else {
            return 'Invalid IP or hostname';
          }
        }

        return null;
      },
    },
    onSubmitPreventDefault: 'always',
    validateInputOnChange: true,
  });

  return (
    <Stack>
      <Group grow align="start">
        <TextInput
          label={
            <LabelWithTooltip
              label="Host"
              tooltip="Bind address. Default values is 0.0.0.0 (i.e. all interfaces are listened)"
            />
          }
          placeholder="ip or hostname"
          {...form.getInputProps('host', { type: 'input' })}
        />
        <NumberInput
          label={<LabelWithTooltip label="Port" tooltip="Bind port" />}
          min={1}
          max={65_535}
          step={1}
          allowDecimal={false}
          {...form.getInputProps('port', { type: 'input' })}
        />
      </Group>
      <NumberInput
        label={
          <LabelWithTooltip
            label="Max pending requests"
            tooltip="Maximum number of incoming requests to store in queue before they are processed. If a request is received and the queue is full a 429 response will be returned immediately. Default value is 100."
          />
        }
        min={1}
        step={1}
        allowDecimal={false}
        {...form.getInputProps('max_pending_requests', { type: 'input' })}
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
