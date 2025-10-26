import { Divider, TextInput, Title } from '@mantine/core';
import { UseFormReturnType } from '@mantine/form';
import { FC } from 'react';

import { Settings } from '@/api/routes/instance/schemas';
import { LabelWithTooltip } from '@/components/ui/LabelWithTooltip';

interface PathParametersProps {
  form: UseFormReturnType<Settings>;
}

export const PathParameters: FC<PathParametersProps> = ({ form }) => {
  return (
    <>
      <Title order={2} fw={500} mt="xl">
        Path parameters
      </Title>
      <Divider my="sm" />
      <TextInput
        label={
          <LabelWithTooltip
            label="Generator configuration file name"
            tooltip={`Filename for generator configurations.
                            This parameter is used by the API for detection directories with generator configurations.
                            Directory with generator configuration named other than this parameter value will not be operable using API endpoints.`}
            maw="500px"
          />
        }
        placeholder="file name (e.g. generator.yml)"
        {...form.getInputProps('path.generator_config_filename', {
          type: 'input',
        })}
      />
      <TextInput
        label={
          <LabelWithTooltip
            label="Path to generators directory"
            tooltip="Absolute path to directory with generators configuration files"
          />
        }
        placeholder="/path/to/generators/"
        {...form.getInputProps('path.generators_dir', {
          type: 'input',
        })}
      />
      <TextInput
        label={
          <LabelWithTooltip
            label="Path to startup file"
            tooltip="Absolute path to file with list of generators to run at startup"
          />
        }
        placeholder="/path/to/startup.yml"
        {...form.getInputProps('path.startup', {
          type: 'input',
        })}
      />
      <TextInput
        label={
          <LabelWithTooltip
            label="Path to keyring file"
            tooltip="Absolute path to keyring encrypted file with stored secrets"
          />
        }
        placeholder="/path/to/cryptfile_pass.cfg"
        {...form.getInputProps('path.keyring_cryptfile', {
          type: 'input',
        })}
      />
      <TextInput
        label={
          <LabelWithTooltip
            label="Path to logs directory"
            tooltip="Absolute path to logs directory"
          />
        }
        placeholder="/path/to/logs/"
        {...form.getInputProps('path.logs', {
          type: 'input',
        })}
      />
    </>
  );
};
