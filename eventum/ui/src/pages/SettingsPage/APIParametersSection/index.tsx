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
import { FC } from 'react';

import { APIParameters } from '@/api/routes/instance/schemas';
import { LabelWithTooltip } from '@/components/ui/LabelWithTooltip';

interface APIParametersSectionProps {
  form: UseFormReturnType<APIParameters>;
}

export const APIParametersSection: FC<APIParametersSectionProps> = ({
  form,
}) => {
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
        {...form.getInputProps('enabled', { type: 'checkbox' })}
        key={form.key('enabled')}
      />
      <Alert
        variant="default"
        icon={<Box c="orange" component={IconAlertTriangle}></Box>}
        title="Disabling API"
        hidden={form.getValues().enabled}
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
          disabled={!form.getValues().enabled}
          {...form.getInputProps('host')}
          key={form.key('host')}
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
          disabled={!form.getValues().enabled}
          {...form.getInputProps('port')}
          key={form.key('port')}
        />
      </Group>
      <Title order={3} fw={500} mt="md">
        SSL
      </Title>
      <Switch
        label="Enable SSL"
        disabled={!form.getValues().enabled}
        {...form.getInputProps('ssl.enabled', {
          type: 'checkbox',
        })}
        key={form.key('ssl.enabled')}
      />
      <Radio.Group
        name="verifyMode"
        label="Client certificate verification mode"
        description="Select how the server verifies client certificates during TLS handshake"
        {...form.getInputProps('ssl.verify_mode')}
        key={form.key('ssl.verify_mode')}
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
                disabled={
                  !form.getValues().enabled || !form.getValues().ssl.enabled
                }
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
                disabled={
                  !form.getValues().enabled || !form.getValues().ssl.enabled
                }
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
                disabled={
                  !form.getValues().enabled || !form.getValues().ssl.enabled
                }
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
        disabled={!form.getValues().enabled || !form.getValues().ssl.enabled}
        {...form.getInputProps('ssl.ca_cert')}
        key={form.key('ssl.ca_cert')}
      />
      <TextInput
        label={
          <LabelWithTooltip
            label="Path to server certificate"
            tooltip="Absolute path to server certificate of PEM format"
          />
        }
        placeholder="/path/to/cert.pem"
        disabled={!form.getValues().enabled || !form.getValues().ssl.enabled}
        {...form.getInputProps('ssl.cert')}
        key={form.key('ssl.cert')}
      />
      <TextInput
        label={
          <LabelWithTooltip
            label="Path to server certificate key"
            tooltip="Absolute path to server certificate key"
          />
        }
        placeholder="/path/to/key.pem"
        disabled={!form.getValues().enabled || !form.getValues().ssl.enabled}
        {...form.getInputProps('ssl.cert_key')}
        key={form.key('ssl.cert_key')}
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
          disabled={!form.getValues().enabled}
          {...form.getInputProps('auth.user')}
          key={form.key('auth.user')}
        />
        <PasswordInput
          label={
            <LabelWithTooltip
              label="Password"
              tooltip="Password for username for basic authentication of API requests"
            />
          }
          disabled={!form.getValues().enabled}
          {...form.getInputProps('auth.password')}
          key={form.key('auth.password')}
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
