import {
  Alert,
  Box,
  Center,
  Container,
  Divider,
  Grid,
  Group,
  List,
  Loader,
  NumberInput,
  PasswordInput,
  Radio,
  Select,
  Stack,
  Switch,
  TableOfContents,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import {
  IconAlertSquareRounded,
  IconApiOff,
  IconCalculator,
  IconInfoCircle,
  IconLockExclamation,
} from '@tabler/icons-react';
import bytes from 'bytes';
import { useEffect, useState } from 'react';
import validator from 'validator';

import { useInstanceSettings } from '@/api/hooks/useInstance';
import {
  LOG_FORMATS,
  LOG_LEVELS,
  Settings,
  TIMEZONES,
} from '@/api/routes/instance/schemas';
import { LabelWithTooltip } from '@/components/ui/LabelWithTooltip';

export default function SettingsPage() {
  const {
    data: instanceSettings,
    isLoading,
    isSuccess,
    isError,
    error,
  } = useInstanceSettings();
  const [batchingMode, setBatchingMode] = useState<
    'size' | 'delay' | 'combined'
  >();
  const [eventSize, setEventSize] = useState<number>(1000);

  const form = useForm<Settings>({
    validate: {
      api: {
        host: (value, values) => {
          if (value.length === 0) {
            return null;
          }

          if (values.api.enabled) {
            if (
              validator.isIP(value) ||
              validator.isFQDN(value, {
                require_tld: false,
                allow_underscores: true,
              })
            ) {
              return null;
            } else {
              return 'Invalid hostname or IP address';
            }
          } else {
            return null;
          }
        },
      },
    },
    validateInputOnChange: true,
    onSubmitPreventDefault: 'always',
  });

  useEffect(() => {
    if (instanceSettings) {
      form.initialize(instanceSettings);

      setBatchingMode(
        instanceSettings.generation.batch.size !== null &&
          instanceSettings.generation.batch.delay !== null
          ? 'combined'
          : instanceSettings.generation.batch.size == null
            ? 'delay'
            : 'size'
      );
    }
  }, [instanceSettings]);

  if (isLoading) {
    return (
      <Center>
        <Loader size="lg" />
      </Center>
    );
  }

  if (isError) {
    return (
      <Container size="md" mt="xl">
        <Alert
          variant="default"
          icon={<Box c="red" component={IconAlertSquareRounded}></Box>}
          title="Failed to get instance settings"
        >
          {error.message}
        </Alert>
      </Container>
    );
  }

  if (isSuccess && form.initialized) {
    return (
      <Container size="xl" mt="xl" mb="520px">
        <Grid gutter="xl">
          <Grid.Col span="auto">
            <form>
              <Stack>
                <Title order={2} fw={500}>
                  API parameters
                </Title>
                <Divider my="sm" />
                <Switch
                  label={
                    <LabelWithTooltip
                      label="Enable API"
                      tooltip="Eventum API is used for external app control and for serving web interface"
                    />
                  }
                  {...form.getInputProps('api.enabled', { type: 'checkbox' })}
                />
                <Alert
                  variant="default"
                  icon={<Box c="orange" component={IconApiOff}></Box>}
                  title="Disabling API"
                  hidden={form.values.api.enabled}
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
                    disabled={!form.values.api.enabled}
                    {...form.getInputProps('api.host', { type: 'input' })}
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
                    disabled={!form.values.api.enabled}
                    {...form.getInputProps('api.port', { type: 'input' })}
                  />
                </Group>
                <Title order={3} fw={500} mt="md">
                  SSL
                </Title>
                <Switch
                  label="Enable SSL"
                  disabled={!form.values.api.enabled}
                  {...form.getInputProps('api.ssl.enabled', {
                    type: 'checkbox',
                  })}
                />
                <Radio.Group
                  name="verifyMode"
                  label="Client certificate verification mode"
                  description="Select how the server verifies client certificates during TLS handshake"
                  {...form.getInputProps('api.ssl.verify_mode', {
                    type: 'input',
                  })}
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
                            !form.values.api.enabled ||
                            !form.values.api.ssl.enabled
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
                            !form.values.api.enabled ||
                            !form.values.api.ssl.enabled
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
                            !form.values.api.enabled ||
                            !form.values.api.ssl.enabled
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
                  disabled={
                    !form.values.api.enabled || !form.values.api.ssl.enabled
                  }
                  {...form.getInputProps('api.ssl.ca_cert', {
                    type: 'input',
                  })}
                />
                <TextInput
                  label={
                    <LabelWithTooltip
                      label="Path to server certificate"
                      tooltip="Absolute path to server certificate of PEM format"
                    />
                  }
                  placeholder="/path/to/cert.pem"
                  disabled={
                    !form.values.api.enabled || !form.values.api.ssl.enabled
                  }
                  {...form.getInputProps('api.ssl.cert', { type: 'input' })}
                />
                <TextInput
                  label={
                    <LabelWithTooltip
                      label="Path to server certificate key"
                      tooltip="Absolute path to server certificate key"
                    />
                  }
                  placeholder="/path/to/key.pem"
                  disabled={
                    !form.values.api.enabled || !form.values.api.ssl.enabled
                  }
                  {...form.getInputProps('api.ssl.cert_key', {
                    type: 'input',
                  })}
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
                    disabled={!form.values.api.enabled}
                    {...form.getInputProps('api.auth.user', {
                      type: 'input',
                    })}
                  />
                  <PasswordInput
                    label={
                      <LabelWithTooltip
                        label="Password"
                        tooltip="Password for username for basic authentication of API requests"
                      />
                    }
                    disabled={!form.values.api.enabled}
                    {...form.getInputProps('api.auth.password', {
                      type: 'input',
                    })}
                  />
                </Group>
                <Alert
                  variant="default"
                  icon={<Box c="orange" component={IconLockExclamation}></Box>}
                  title="Security notification"
                >
                  Username and password are parameters in configuration file
                  that stored in <b>plain text</b>.
                </Alert>
                <Title order={2} fw={500} mt="xl">
                  Generation parameters
                </Title>
                <Divider my="sm" />
                <Switch
                  label={
                    <LabelWithTooltip
                      label="Keep events order"
                      tooltip="Whether to keep chronological order of events using their timestamps by disabling output plugins concurrency"
                    />
                  }
                  {...form.getInputProps('generation.keep_order', {
                    type: 'checkbox',
                  })}
                />
                <Select
                  label={
                    <LabelWithTooltip
                      label="Timezone"
                      tooltip="Time zone for generating timestamps"
                    />
                  }
                  data={TIMEZONES}
                  searchable
                  nothingFoundMessage="No timezones matched"
                  placeholder="zone name"
                  {...form.getInputProps('generation.timezone', {
                    type: 'input',
                  })}
                />
                <NumberInput
                  label={
                    <LabelWithTooltip
                      label="Maximum concurrent writes"
                      tooltip="Maximum number of write operations performed by output plugins concurrently"
                    />
                  }
                  placeholder="number"
                  min={1}
                  allowDecimal={false}
                  {...form.getInputProps('generation.max_concurrency', {
                    type: 'input',
                  })}
                />
                <NumberInput
                  label={
                    <LabelWithTooltip
                      label="Write timeout"
                      tooltip="Timeout before canceling single write task"
                    />
                  }
                  placeholder="seconds"
                  suffix=" s."
                  min={0.1}
                  step={0.1}
                  {...form.getInputProps('generation.write_timeout', {
                    type: 'input',
                  })}
                />
                <Title order={3} fw={500} mt="md">
                  Batching
                </Title>
                <Radio.Group
                  name="batchingMode"
                  label="Batching mode"
                  description="Batch is formed by at least one condition"
                  value={batchingMode}
                >
                  <Group mt="xs">
                    <Tooltip
                      withArrow
                      label="Use only size condition for batch formation"
                      position="bottom"
                      offset={12}
                      openDelay={200}
                    >
                      <Box>
                        <Radio
                          value="size"
                          label="Size"
                          onClick={() => {
                            setBatchingMode('size');
                            form.setFieldValue('generation.batch.delay', null);
                          }}
                        />
                      </Box>
                    </Tooltip>
                    <Tooltip
                      withArrow
                      label="Use only delay condition for batch formation"
                      position="bottom"
                      offset={12}
                      openDelay={200}
                    >
                      <Box>
                        <Radio
                          value="delay"
                          label="Delay"
                          onClick={() => {
                            setBatchingMode('delay');
                            form.setFieldValue('generation.batch.size', null);
                          }}
                        />
                      </Box>
                    </Tooltip>
                    <Tooltip
                      withArrow
                      label="Use both size and delay conditions for batch formation. Batch is formed by the first true condition."
                      position="bottom"
                      offset={12}
                      openDelay={200}
                      maw={300}
                      multiline
                    >
                      <Box>
                        <Radio
                          value="combined"
                          label="Combined"
                          onClick={() => {
                            setBatchingMode('combined');
                          }}
                        />
                      </Box>
                    </Tooltip>
                  </Group>
                </Radio.Group>
                <Group grow align="start">
                  <NumberInput
                    label={
                      <LabelWithTooltip
                        label="Batch size"
                        tooltip="Maximum number of timestamps for single batch"
                      />
                    }
                    placeholder="size"
                    min={1}
                    allowDecimal={false}
                    disabled={batchingMode === 'delay'}
                    {...form.getInputProps('generation.batch.size', {
                      type: 'input',
                    })}
                    value={form.values.generation.batch.size ?? undefined}
                  />
                  <NumberInput
                    label={
                      <LabelWithTooltip
                        label="Batch delay"
                        tooltip="Maximum time for single batch to accumulate incoming timestamps"
                      />
                    }
                    placeholder="seconds"
                    suffix=" s."
                    min={0.1}
                    step={0.1}
                    disabled={batchingMode === 'size'}
                    {...form.getInputProps('generation.batch.delay', {
                      type: 'input',
                    })}
                    value={form.values.generation.batch.delay ?? undefined}
                  />
                </Group>
                <Alert
                  variant="default"
                  icon={<Box c="blue" component={IconInfoCircle}></Box>}
                  title="Batch lifecycle"
                >
                  Formed batch preserve its size throughout the entire workflow
                  of plugins. At event plugin stage, batch is expanded from
                  timestamps to events. So, for large events, smaller batch
                  sizes are preferred.
                </Alert>
                <Title order={3} fw={500} mt="md">
                  Queue
                </Title>
                <Group grow align="start">
                  <NumberInput
                    label={
                      <LabelWithTooltip
                        label="Maximum timestamp batches"
                        tooltip="Maximum number of batches in timestamps queue (between all input and event plugins)"
                      />
                    }
                    placeholder="size"
                    min={1}
                    allowDecimal={false}
                    {...form.getInputProps(
                      'generation.queue.max_timestamp_batches',
                      {
                        type: 'input',
                      }
                    )}
                  />
                  <NumberInput
                    label={
                      <LabelWithTooltip
                        label="Maximum event batches"
                        tooltip="Maximum number of batches in events queue (between event and output plugins)"
                      />
                    }
                    placeholder="size"
                    min={1}
                    allowDecimal={false}
                    {...form.getInputProps(
                      'generation.queue.max_event_batches',
                      {
                        type: 'input',
                      }
                    )}
                  />
                </Group>
                <Alert
                  variant="default"
                  icon={<Box c="blue" component={IconCalculator}></Box>}
                  title="Size approximation"
                >
                  With event size{' '}
                  <NumberInput
                    w="80px"
                    allowDecimal={false}
                    value={eventSize}
                    onChange={(value) => setEventSize(Number(value))}
                    min={1}
                    step={1}
                    display="inline-block"
                    size="xs"
                    mx="4px"
                    hideControls
                    variant="filled"
                    style={{
                      input: {
                        textAlign: 'right',
                      },
                    }}
                  />{' '}
                  bytes full queues for one generator will consume:
                  <List size="sm">
                    <List.Item>
                      Timestamps queue ~
                      <b>
                        {form.values.generation.batch.size !== null ? (
                          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                          bytes(
                            form.values.generation.batch.size *
                              form.values.generation.queue
                                .max_timestamp_batches *
                              16,
                            { decimalPlaces: 2 }
                          )
                        ) : (
                          <b style={{ color: 'var(--mantine-color-red-text)' }}>
                            Possibly unlimited
                          </b>
                        )}
                      </b>
                    </List.Item>
                    <List.Item>
                      Events queue ~
                      <b>
                        {form.values.generation.batch.size !== null ? (
                          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                          bytes(
                            form.values.generation.batch.size *
                              form.values.generation.queue.max_event_batches *
                              eventSize,
                            { decimalPlaces: 2 }
                          )
                        ) : (
                          <b style={{ color: 'var(--mantine-color-red-text)' }}>
                            Possibly unlimited
                          </b>
                        )}
                      </b>
                    </List.Item>
                  </List>
                </Alert>
                <Title order={2} fw={500} mt="xl">
                  Path parameters
                </Title>
                <Divider my="sm" />
                <TextInput
                  label="Generator configuration file name"
                  placeholder="file name (e.g. generator.yml)"
                  {...form.getInputProps('path.generator_config_filename', {
                    type: 'input',
                  })}
                />
                <TextInput
                  label="Path to generators directory"
                  placeholder="/path/to/generators/"
                  {...form.getInputProps('path.generators_dir', {
                    type: 'input',
                  })}
                />
                <TextInput
                  label="Path to startup file"
                  placeholder="/path/to/startup.yml"
                  {...form.getInputProps('path.startup', {
                    type: 'input',
                  })}
                />
                <TextInput
                  label="Path to keyring file"
                  placeholder="/path/to/cryptfile_pass.cfg"
                  {...form.getInputProps('path.keyring_cryptfile', {
                    type: 'input',
                  })}
                />
                <TextInput
                  label="Path to logs directory"
                  placeholder="/path/to/logs/"
                  {...form.getInputProps('path.logs', {
                    type: 'input',
                  })}
                />
                <Title order={2} fw={500} mt="xl">
                  Logging parameters
                </Title>
                <Divider my="sm" />
                <Select
                  label="Logging level"
                  data={LOG_LEVELS}
                  placeholder="level"
                  {...form.getInputProps('log.level', {
                    type: 'input',
                  })}
                />
                <Select
                  label="Logs format"
                  data={LOG_FORMATS}
                  placeholder="format"
                  {...form.getInputProps('log.format', {
                    type: 'input',
                  })}
                />
                <Title order={3} fw={500} mt="md">
                  Rotation
                </Title>
                <Group grow>
                  <NumberInput
                    label="Maximum bytes per file"
                    placeholder="bytes"
                    {...form.getInputProps('log.max_bytes', {
                      type: 'input',
                    })}
                  />
                  <NumberInput
                    label="Rotated files count"
                    placeholder="number"
                    {...form.getInputProps('log.backups', {
                      type: 'input',
                    })}
                  />
                </Group>
              </Stack>
            </form>
          </Grid.Col>

          <Grid.Col span={3}>
            <Box
              style={{
                position: 'sticky',
                top: 80,
                alignSelf: 'flex-start',
              }}
            >
              <TableOfContents
                variant="filled"
                size="sm"
                radius="sm"
                scrollSpyOptions={{ selector: ':is(h2)' }}
                getControlProps={({ data }) => ({
                  onClick: () =>
                    data.getNode().scrollIntoView({ behavior: 'smooth' }),
                  children: data.value,
                })}
              />
            </Box>
          </Grid.Col>
        </Grid>
      </Container>
    );
  }
}
