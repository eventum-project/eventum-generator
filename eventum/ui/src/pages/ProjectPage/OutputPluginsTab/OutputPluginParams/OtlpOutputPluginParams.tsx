import {
  Group,
  JsonInput,
  NumberInput,
  Paper,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { zod4Resolver } from 'mantine-form-zod-resolver';
import { FC } from 'react';

import { ProjectFileSelect } from '../../components/ProjectFileSelect';
import { FormatterParams } from './components/FormatterParams';
import {
  OTLP_COMPRESSIONS,
  OTLP_PROTOCOLS,
  OtlpOutputPluginConfig,
  OtlpOutputPluginConfigSchema,
} from '@/api/routes/generator-configs/schemas/plugins/output/configs/otlp';
import { LabelWithTooltip } from '@/components/ui/LabelWithTooltip';

interface OtlpOutputPluginParamsProps {
  initialConfig: OtlpOutputPluginConfig;
  onChange: (config: OtlpOutputPluginConfig) => void;
}

export const OtlpOutputPluginParams: FC<OtlpOutputPluginParamsProps> = ({
  initialConfig,
  onChange,
}) => {
  const form = useForm<OtlpOutputPluginConfig>({
    initialValues: initialConfig,
    validate: zod4Resolver(OtlpOutputPluginConfigSchema),
    onValuesChange: onChange,
    validateInputOnChange: true,
  });

  return (
    <Stack gap="xs">
      <TextInput
        label={
          <LabelWithTooltip
            label="Endpoint"
            tooltip="Address of the OTLP receiver, /v1/logs is appended when
            the address carries no path"
          />
        }
        placeholder="url address"
        required
        {...form.getInputProps('endpoint')}
        value={form.values.endpoint ?? ''}
        onChange={(value) =>
          form.setFieldValue(
            'endpoint',
            value.currentTarget.value !== ''
              ? value.currentTarget.value
              : undefined!
          )
        }
      />

      <Group grow wrap="nowrap" align="start">
        <Select
          label={
            <LabelWithTooltip
              label="Protocol"
              tooltip="Wire encoding of the request body, default value is
              http/protobuf"
            />
          }
          placeholder="protocol"
          data={OTLP_PROTOCOLS}
          clearable
          {...form.getInputProps('protocol')}
          value={form.values.protocol ?? null}
          onChange={(value) =>
            form.setFieldValue('protocol', value ?? undefined)
          }
        />

        <Select
          label={
            <LabelWithTooltip
              label="Compression"
              tooltip="Compression applied to the request body, default
              value is none"
            />
          }
          placeholder="compression"
          data={OTLP_COMPRESSIONS}
          clearable
          {...form.getInputProps('compression')}
          value={form.values.compression ?? null}
          onChange={(value) =>
            form.setFieldValue('compression', value ?? undefined)
          }
        />
      </Group>

      <JsonInput
        label="Headers"
        description="Extra request headers, a Content-Type or
        Content-Encoding entry is overridden since both are dictated by
        protocol and compression"
        placeholder="{ ... }"
        validationError="Invalid JSON"
        minRows={2}
        autosize
        defaultValue={JSON.stringify(form.values.headers, undefined, 2)}
        onChange={(value) => {
          if (!value) {
            form.setFieldValue('headers', undefined);
            return;
          }

          let parsed: unknown;
          try {
            parsed = JSON.parse(value);
          } catch {
            return;
          }

          if (typeof parsed === 'object') {
            form.setFieldValue('headers', parsed as Record<string, string>);
          }
        }}
        error={form.errors.headers}
      />

      <JsonInput
        label="Resource attributes"
        description="Static attributes added to every resource, overrides
        the default service.name and telemetry.sdk.* attributes when a
        key collides"
        placeholder="{ ... }"
        validationError="Invalid JSON"
        minRows={2}
        autosize
        defaultValue={JSON.stringify(
          form.values.resource_attributes,
          undefined,
          2
        )}
        onChange={(value) => {
          if (!value) {
            form.setFieldValue('resource_attributes', undefined);
            return;
          }

          let parsed: unknown;
          try {
            parsed = JSON.parse(value);
          } catch {
            return;
          }

          if (typeof parsed === 'object') {
            form.setFieldValue(
              'resource_attributes',
              parsed as Record<string, string | number | boolean>
            );
          }
        }}
        error={form.errors.resource_attributes}
      />

      <JsonInput
        label="Lifted resource attributes"
        description="Resource attribute name mapped to the dotted path of
        the event field whose value is lifted into it, records are
        grouped into one resource per distinct combination of lifted
        values"
        placeholder="{ ... }"
        validationError="Invalid JSON"
        minRows={2}
        autosize
        defaultValue={JSON.stringify(
          form.values.resource_attributes_from,
          undefined,
          2
        )}
        onChange={(value) => {
          if (!value) {
            form.setFieldValue('resource_attributes_from', undefined);
            return;
          }

          let parsed: unknown;
          try {
            parsed = JSON.parse(value);
          } catch {
            return;
          }

          if (typeof parsed === 'object') {
            form.setFieldValue(
              'resource_attributes_from',
              parsed as Record<string, string>
            );
          }
        }}
        error={form.errors.resource_attributes_from}
      />

      <Group grow wrap="nowrap" align="start">
        <TextInput
          label={
            <LabelWithTooltip
              label="Body field"
              tooltip="Dotted path of the event field carrying the record
              body, the whole event is used as the body by default, and
              when the field is absent or null"
            />
          }
          placeholder="field.path"
          {...form.getInputProps('body_field')}
          value={form.values.body_field ?? ''}
          onChange={(value) =>
            form.setFieldValue(
              'body_field',
              value.currentTarget.value !== ''
                ? value.currentTarget.value
                : undefined
            )
          }
        />

        <TextInput
          label={
            <LabelWithTooltip
              label="Timestamp field"
              tooltip="Dotted path of the event field carrying the record
              time, default value is @timestamp, the time of writing is
              used when unset"
            />
          }
          placeholder="field.path"
          {...form.getInputProps('timestamp_field')}
          value={form.values.timestamp_field ?? ''}
          onChange={(value) =>
            form.setFieldValue(
              'timestamp_field',
              value.currentTarget.value !== ''
                ? value.currentTarget.value
                : undefined
            )
          }
        />

        <TextInput
          label={
            <LabelWithTooltip
              label="Severity field"
              tooltip="Dotted path of the event field carrying the record
              severity, default value is log.level, no severity is read
              from the event when unset"
            />
          }
          placeholder="field.path"
          {...form.getInputProps('severity_field')}
          value={form.values.severity_field ?? ''}
          onChange={(value) =>
            form.setFieldValue(
              'severity_field',
              value.currentTarget.value !== ''
                ? value.currentTarget.value
                : undefined
            )
          }
        />
      </Group>

      <Switch
        label={
          <LabelWithTooltip
            label="Flatten attributes"
            tooltip="Whether to flatten nested objects into dotted
            attribute keys, disable to keep their nested shape"
          />
        }
        {...form.getInputProps('flatten_attributes', { type: 'checkbox' })}
        checked={
          typeof form.values.flatten_attributes === 'boolean'
            ? form.values.flatten_attributes
            : true
        }
      />

      <Group grow wrap="nowrap" align="start">
        <NumberInput
          label={
            <LabelWithTooltip
              label="Connect timeout"
              tooltip="Connection timeout in seconds, default value is 10"
            />
          }
          placeholder="seconds"
          suffix=" s."
          min={1}
          step={1}
          allowDecimal={false}
          {...form.getInputProps('connect_timeout')}
          value={form.getValues().connect_timeout ?? ''}
          onChange={(value) =>
            form.setFieldValue(
              'connect_timeout',
              typeof value === 'number' ? value : undefined
            )
          }
        />
        <NumberInput
          label={
            <LabelWithTooltip
              label="Request timeout"
              tooltip="Request timeout in seconds, default value is 300"
            />
          }
          placeholder="seconds"
          suffix=" s."
          min={1}
          step={1}
          allowDecimal={false}
          {...form.getInputProps('request_timeout')}
          value={form.getValues().request_timeout ?? ''}
          onChange={(value) =>
            form.setFieldValue(
              'request_timeout',
              typeof value === 'number' ? value : undefined
            )
          }
        />
        <NumberInput
          label={
            <LabelWithTooltip
              label="Max request bytes"
              tooltip="Approximate byte budget of a single request,
              records of one write are split across several requests to
              stay within it. Default value is 4194304"
            />
          }
          placeholder="bytes"
          min={1024}
          step={1}
          allowDecimal={false}
          {...form.getInputProps('max_request_bytes')}
          value={form.getValues().max_request_bytes ?? ''}
          onChange={(value) =>
            form.setFieldValue(
              'max_request_bytes',
              typeof value === 'number' ? value : undefined
            )
          }
        />
      </Group>

      <Paper withBorder p="sm">
        <Stack gap="4px">
          <Text size="sm" fw="bold">
            SSL
          </Text>

          <Switch
            label={
              <LabelWithTooltip
                label="Verify SSL"
                tooltip="Whether to verify SSL certificate of the receiver"
              />
            }
            {...form.getInputProps('verify', { type: 'checkbox' })}
            checked={
              typeof form.values.verify === 'boolean'
                ? form.values.verify
                : true
            }
          />

          <ProjectFileSelect
            label={
              <LabelWithTooltip
                label="CA certificate"
                tooltip="CA certificate for verification of server"
              />
            }
            placeholder=".crt .cer .pem"
            extensions={['.crt', '.cer', '.pem']}
            clearable
            searchable
            {...form.getInputProps('ca_cert')}
            value={form.getValues().ca_cert ?? null}
            onChange={(value) =>
              form.setFieldValue('ca_cert', value ?? undefined)
            }
          />

          <Group grow align="start" wrap="nowrap">
            <ProjectFileSelect
              label={
                <LabelWithTooltip
                  label="Client certificate"
                  tooltip="Client certificate for client verification by
                  server"
                />
              }
              placeholder=".crt .cer .pem"
              extensions={['.crt', '.cer', '.pem']}
              clearable
              searchable
              {...form.getInputProps('client_cert')}
              value={form.getValues().client_cert ?? null}
              onChange={(value) =>
                form.setFieldValue('client_cert', value ?? undefined)
              }
            />
            <ProjectFileSelect
              label={
                <LabelWithTooltip
                  label="Client certificate key"
                  tooltip="Key for the client certificate"
                />
              }
              placeholder=".crt .cer .pem .key"
              extensions={['.crt', '.cer', '.pem', '.key']}
              clearable
              searchable
              {...form.getInputProps('client_cert_key')}
              value={form.getValues().client_cert_key ?? null}
              onChange={(value) =>
                form.setFieldValue('client_cert_key', value ?? undefined)
              }
            />
          </Group>
        </Stack>
      </Paper>

      <TextInput
        label={
          <LabelWithTooltip label="Proxy URL" tooltip="HTTP(S) proxy address" />
        }
        placeholder="URL"
        {...form.getInputProps('proxy_url')}
        onChange={(value) =>
          form.setFieldValue(
            'proxy_url',
            value.currentTarget.value !== ''
              ? value.currentTarget.value
              : undefined
          )
        }
      />

      <Paper withBorder p="xs">
        <FormatterParams
          value={form.getValues().formatter}
          onChange={(values) => form.setFieldValue('formatter', values)}
        />
      </Paper>
    </Stack>
  );
};
