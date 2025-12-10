import { Alert, Box, Select, Skeleton, Stack } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconAlertSquareRounded } from '@tabler/icons-react';
import { zod4Resolver } from 'mantine-form-zod-resolver';
import { FC, useMemo } from 'react';

import { useGeneratorFileTree } from '@/api/hooks/useGeneratorConfigs';
import { flattenFileTree } from '@/api/routes/generator-configs/modules/file-tree';
import {
  ScriptEventPluginConfig,
  ScriptEventPluginConfigSchema,
} from '@/api/routes/generator-configs/schemas/plugins/event/configs/script';
import { LabelWithTooltip } from '@/components/ui/LabelWithTooltip';
import { ShowErrorDetailsAnchor } from '@/components/ui/ShowErrorDetailsAnchor';
import { useProjectName } from '@/pages/ProjectPage/hooks/useProjectName';

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

  const { projectName } = useProjectName();
  const {
    data: fileTree,
    isLoading: isFileTreeLoading,
    isError: isFileTreeError,
    error: fileTreeError,
    isSuccess: isFileTreeSuccess,
  } = useGeneratorFileTree(projectName);

  const filesList = useMemo(() => {
    if (isFileTreeSuccess) {
      return flattenFileTree(fileTree, true);
    } else {
      return [];
    }
  }, [fileTree, isFileTreeSuccess]);

  return (
    <Stack>
      {isFileTreeLoading && (
        <Stack>
          <Skeleton h="250px" animate visible />
        </Stack>
      )}

      {isFileTreeError && (
        <Alert
          variant="default"
          icon={<Box c="red" component={IconAlertSquareRounded}></Box>}
          title="Failed to load list of project files"
        >
          {fileTreeError.message}
          <ShowErrorDetailsAnchor error={fileTreeError} prependDot />
        </Alert>
      )}

      {isFileTreeSuccess && (
        <Stack>
          <Select
            label={
              <LabelWithTooltip label="Path" tooltip="Path to script file" />
            }
            placeholder="path"
            data={filesList}
            clearable
            searchable
            {...form.getInputProps('path')}
          />
        </Stack>
      )}
    </Stack>
  );
};
