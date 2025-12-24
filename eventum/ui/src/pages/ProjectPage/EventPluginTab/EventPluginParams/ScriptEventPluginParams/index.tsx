import { Stack } from '@mantine/core';
import { useForm } from '@mantine/form';
import { zod4Resolver } from 'mantine-form-zod-resolver';
import { FC } from 'react';

import {
  ScriptEventPluginConfig,
  ScriptEventPluginConfigSchema,
} from '@/api/routes/generator-configs/schemas/plugins/event/configs/script';
import { LabelWithTooltip } from '@/components/ui/LabelWithTooltip';
import { ProjectFileSelect } from '@/pages/ProjectPage/components/ProjectFileSelect';

interface ScriptEventPluginParamsProps {
  initialConfig: ScriptEventPluginConfig;
  onChange: (config: ScriptEventPluginConfig) => void;
}

export const ScriptEventPluginParams: FC<ScriptEventPluginParamsProps> = ({
  initialConfig,
  onChange,
}) => {
  const form = useForm<ScriptEventPluginConfig>({
    initialValues: initialConfig,
    validate: zod4Resolver(ScriptEventPluginConfigSchema),
    transformValues: (values) => {
      const newValues = { ...values };

      return newValues;
    },
    onValuesChange: () => {
      onChange(form.getTransformedValues());
    },
    onSubmitPreventDefault: 'always',
    validateInputOnChange: true,
  });

  return (
    <Stack>
      <ProjectFileSelect
        label={<LabelWithTooltip label="Path" tooltip="Path to script file" />}
        placeholder="path"
        clearable
        searchable
        extensions={['.py']}
        {...form.getInputProps('path')}
      />
    </Stack>
  );
};
