import { Alert, Box, JsonInput, Skeleton, Stack } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconAlertSquareRounded } from '@tabler/icons-react';
import { zod4Resolver } from 'mantine-form-zod-resolver';
import { FC, useMemo } from 'react';

import { SamplesSection } from './SamplesSection';
import { TemplatesSection } from './TemplatesSection';
import { useGeneratorFileTree } from '@/api/hooks/useGeneratorConfigs';
import { flattenFileTree } from '@/api/routes/generator-configs/modules/file-tree';
import {
  TemplateEventPluginConfig,
  TemplateEventPluginConfigSchema,
} from '@/api/routes/generator-configs/schemas/plugins/event/configs/template';
import { ShowErrorDetailsAnchor } from '@/components/ui/ShowErrorDetailsAnchor';
import { useProjectName } from '@/pages/ProjectPage/hooks/useProjectName';

interface TemplateEventPluginParamsProps {
  initialConfig: TemplateEventPluginConfig;
  onChange: (config: TemplateEventPluginConfig) => void;
}

export const TemplateEventPluginParams: FC<TemplateEventPluginParamsProps> = ({
  initialConfig,
  onChange,
}) => {
  const form = useForm<TemplateEventPluginConfig>({
    initialValues: initialConfig,
    validate: zod4Resolver(TemplateEventPluginConfigSchema),
    onValuesChange: onChange,
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
      <JsonInput
        label="Parameters"
        description="Each parameter is an attribute of a single JSON object"
        placeholder="{ ... }"
        validationError="Invalid JSON"
        minRows={4}
        autosize
        defaultValue={JSON.stringify(form.getValues().params)}
        onChange={(value) => {
          if (!value) {
            form.setFieldValue('params', {});
            return;
          }

          let parsed: unknown;
          try {
            parsed = JSON.parse(value);
          } catch {
            return;
          }

          if (typeof parsed === 'object') {
            form.setFieldValue('params', parsed as Record<string, never>);
          }
        }}
        error={form.errors.params}
      />

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
          <SamplesSection form={form} existingFiles={filesList} />
          <TemplatesSection form={form} existingFiles={filesList} />
        </Stack>
      )}
    </Stack>
  );
};
