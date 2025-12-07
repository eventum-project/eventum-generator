import { Divider, Group, NumberInput, Select, Title } from '@mantine/core';
import { UseFormReturnType } from '@mantine/form';
import { FC } from 'react';

import {
  LOG_FORMATS,
  LOG_LEVELS,
  Settings,
} from '@/api/routes/instance/schemas';
import { LabelWithTooltip } from '@/components/ui/LabelWithTooltip';

interface LoggingParametersProps {
  form: UseFormReturnType<Settings>;
}

export const LoggingParameters: FC<LoggingParametersProps> = ({ form }) => {
  return (
    <>
      <Title order={2} fw={500} mt="xl">
        Logging parameters
      </Title>
      <Divider />
      <Select
        label={
          <LabelWithTooltip
            label="Logging level"
            tooltip="Minimal severity of messages to log"
          />
        }
        data={LOG_LEVELS}
        placeholder="level"
        {...form.getInputProps('log.level', {
          type: 'input',
        })}
        key={form.key('log.level')}
      />
      <Select
        label={
          <LabelWithTooltip label="Logs format" tooltip="Logging format" />
        }
        data={LOG_FORMATS}
        placeholder="format"
        {...form.getInputProps('log.format', {
          type: 'input',
        })}
        key={form.key('log.format')}
      />
      <Title order={3} fw={500} mt="md">
        Rotation
      </Title>
      <Group grow align="start">
        <NumberInput
          label={
            <LabelWithTooltip
              label="Maximum bytes"
              tooltip="Maximum bytes for log file before rotation"
            />
          }
          min={1024}
          allowDecimal={false}
          placeholder="bytes"
          {...form.getInputProps('log.max_bytes', {
            type: 'input',
          })}
          key={form.key('log.max_bytes')}
        />
        <NumberInput
          label={
            <LabelWithTooltip
              label="Rotated files count"
              tooltip="Number of rotated log files to keep"
            />
          }
          min={1}
          allowDecimal={false}
          placeholder="number"
          {...form.getInputProps('log.backups', {
            type: 'input',
          })}
          key={form.key('log.backups')}
        />
      </Group>
    </>
  );
};
