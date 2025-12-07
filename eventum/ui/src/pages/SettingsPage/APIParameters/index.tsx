import {
  Alert,
  Box,
  Divider,
  Group,
  NumberInput,
  PasswordInput,
  Radio,
  Switch,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { UseFormReturnType } from '@mantine/form';
import { IconAlertTriangle, IconLockExclamation } from '@tabler/icons-react';
import { FC, useState } from 'react';

import { Settings } from '@/api/routes/instance/schemas';
import { LabelWithTooltip } from '@/components/ui/LabelWithTooltip';

interface APIParametersProps {
  form: UseFormReturnType<Settings>;
}

export const APIParameters: FC<APIParametersProps> = ({ form }) => {
  const formValues = form.getValues();
  const [APIEnabled, setAPIEnabled] = useState<boolean>(formValues.api.enabled);
  const [SSLEnabled, setSSLEnabled] = useState<boolean>(
    formValues.api.ssl.enabled
  );

  form.watch('api.enabled', ({ value }) => {
    setAPIEnabled(value);
  });
  form.watch('api.ssl.enabled', ({ value }) => {
    setSSLEnabled(value);
  });

  return (
    <>
      <Title order={2} fw={500}>
        API parameters
      </Title>
      <Divider />
      <Switch
        label={
          <LabelWithTooltip
            label="Enable API"
            tooltip="Eventum API is used for external app control and for serving web interface"
          />
        }
        {...form.getInputProps('api.enabled', { type: 'checkbox' })}
        key={form.key('api.enabled')}
      />
      <Alert
        variant="default"
        icon={<Box c="orange" component={IconAlertTriangle}></Box>}
        title="Disabling API"
        hidden={APIEnabled}
      >
        Web interface will be unavailable after disabling API.
      </Alert>
      <Group grow align="start">
        <TextInput
          label={
            <LabelWithTooltip
              label="Bind host"
              tooltip="Address of the interface that should be listened by server (e.g. 127.0.0.1 or 0.0.0.0)"
            />
          }
          placeholder="hostname or IP"
          disabled={!APIEnabled}
          {...form.getInputProps('api.host', { type: 'input' })}
          key={form.key('api.host')}
        />
        <NumberInput
          label={
            <LabelWithTooltip
              label="Bind port"
              tooltip="Port that should be listened by server"
            />
          }
          placeholder="port number (1 - 65 535)"
          allowDecimal={false}
          min={1}
          max={65_535}
          disabled={!APIEnabled}
          {...form.getInputProps('api.port', { type: 'input' })}
          key={form.key('api.port')}
        />
      </Group>
      <Title order={3} fw={500} mt="md">
        SSL
      </Title>
      <Switch
        label="Enable SSL"
        disabled={!APIEnabled}
        {...form.getInputProps('api.ssl.enabled', {
          type: 'checkbox',
        })}
        key={form.key('api.ssl.enabled')}
      />
      <Radio.Group
        name="verifyMode"
        label="Client certificate verification mode"
        description="Select how the server verifies client certificates during TLS handshake"
        {...form.getInputProps('api.ssl.verify_mode', {
          type: 'input',
        })}
        key={form.key('api.ssl.verify_mode')}
      >
        <Group mt="xs">
          <Tooltip
            withArrow
            label="Clients are not required to present a certificate"
            position="bottom"
            offset={12}
            openDelay={200}
          >
            <Box>
              <Radio
                disabled={!APIEnabled || !SSLEnabled}
                value="none"
                label="None"
              />
            </Box>
          </Tooltip>
          <Tooltip
            withArrow
            label="Client certificate is validated if provided, but not required"
            position="bottom"
            offset={12}
            openDelay={200}
          >
            <Box>
              <Radio
                disabled={!APIEnabled || !SSLEnabled}
                value="optional"
                label="Optional"
              />
            </Box>
          </Tooltip>
          <Tooltip
            withArrow
            label="A valid client certificate is required for connection (mTLS)"
            position="bottom"
            offset={12}
            openDelay={200}
          >
            <Box>
              <Radio
                disabled={!APIEnabled || !SSLEnabled}
                value="required"
                label="Required"
              />
            </Box>
          </Tooltip>
        </Group>
      </Radio.Group>
      <TextInput
        label={
          <LabelWithTooltip
            label="Path to CA certificate"
            tooltip="Absolute path to CA certificate of PEM format"
          />
        }
        placeholder="/path/to/ca-cert.pem"
        disabled={!APIEnabled || !SSLEnabled}
        {...form.getInputProps('api.ssl.ca_cert', {
          type: 'input',
        })}
        key={form.key('api.ssl.ca_cert')}
      />
      <TextInput
        label={
          <LabelWithTooltip
            label="Path to server certificate"
            tooltip="Absolute path to server certificate of PEM format"
          />
        }
        placeholder="/path/to/cert.pem"
        disabled={!APIEnabled || !SSLEnabled}
        {...form.getInputProps('api.ssl.cert', { type: 'input' })}
        key={form.key('api.ssl.cert')}
      />
      <TextInput
        label={
          <LabelWithTooltip
            label="Path to server certificate key"
            tooltip="Absolute path to server certificate key"
          />
        }
        placeholder="/path/to/key.pem"
        disabled={!APIEnabled || !SSLEnabled}
        {...form.getInputProps('api.ssl.cert_key', {
          type: 'input',
        })}
        key={form.key('api.ssl.cert_key')}
      />
      <Title order={3} fw={500} mt="md">
        Authentication
      </Title>
      <Group grow align="start">
        <TextInput
          label={
            <LabelWithTooltip
              label="Username"
              tooltip="Username for basic authentication of API requests"
            />
          }
          disabled={!APIEnabled}
          {...form.getInputProps('api.auth.user', {
            type: 'input',
          })}
          key={form.key('api.auth.user')}
        />
        <PasswordInput
          label={
            <LabelWithTooltip
              label="Password"
              tooltip="Password for username for basic authentication of API requests"
            />
          }
          disabled={!APIEnabled}
          {...form.getInputProps('api.auth.password', {
            type: 'input',
          })}
          key={form.key('api.auth.password')}
        />
      </Group>
      <Alert
        variant="default"
        icon={<Box c="orange" component={IconLockExclamation} />}
        title="Security notification"
      >
        Username and password are parameters in configuration file that stored
        in <b>plain text</b>.
      </Alert>
    </>
  );
};
