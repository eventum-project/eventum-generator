import {
  Alert,
  Box,
  Select,
  Skeleton,
  Stack,
  Tabs,
  TagsInput,
  Textarea,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconAlertSquareRounded } from '@tabler/icons-react';
import { zodResolver } from 'mantine-form-zod-resolver';
import { FC } from 'react';

import { useProjectName } from '../../hooks/useProjectName';
import { useGeneratorFileTree } from '@/api/hooks/useGeneratorConfigs';
import { flattenFileTree } from '@/api/routes/generator-configs/modules/file-tree';
import {
  TimestampsInputPluginConfig,
  TimestampsInputPluginConfigSchema,
} from '@/api/routes/generator-configs/schemas/plugins/input/configs/timestamps';
import { LabelWithTooltip } from '@/components/ui/LabelWithTooltip';
import { ShowErrorDetailsAnchor } from '@/components/ui/ShowErrorDetailsAnchor';

interface TimestampsInputPluginParamsProps {
  initialConfig: TimestampsInputPluginConfig;
  onChange: (config: TimestampsInputPluginConfig) => void;
}

export const TimestampsInputPluginParams: FC<
  TimestampsInputPluginParamsProps
> = ({ initialConfig, onChange }) => {
  const form = useForm<TimestampsInputPluginConfig>({
    validate: zodResolver(TimestampsInputPluginConfigSchema),
    initialValues: initialConfig,
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

  return (
    <Stack>
      <Tabs defaultValue="inline">
        <Tabs.List>
          <Tabs.Tab value="inline">Inline</Tabs.Tab>
          <Tabs.Tab value="file">File</Tabs.Tab>
        </Tabs.List>

        <Box mt="xs">
          <Tabs.Panel value="inline">
            <Textarea
              label="Source"
              description="List of ISO8601 timestamps delimited by new line"
              placeholder="..."
              autosize
              minRows={3}
              value={
                typeof form.values.source !== 'string'
                  ? form.values.source.join('\n')
                  : undefined
              }
              onChange={(event) => {
                form.setFieldValue(
                  'source',
                  event.currentTarget.value
                    ? event.currentTarget.value
                        .split('\n')
                        .map((item) => item.trim())
                    : []
                );
              }}
              error={form.errors.source}
            />
          </Tabs.Panel>
          <Tabs.Panel value="file">
            {isFileTreeLoading && (
              <Stack>
                <Skeleton h="xl" animate visible />
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
              <Select
                label={
                  <LabelWithTooltip
                    label="Timestamps file"
                    tooltip="File with new line separated timestamps in ISO8601 format"
                  />
                }
                data={flattenFileTree(fileTree, true)}
                clearable
                searchable
                value={
                  typeof form.values.source === 'string'
                    ? form.values.source
                    : null
                }
                onChange={(value) => {
                  form.setFieldValue('source', value ?? []);
                }}
                error={form.errors.source}
              />
            )}
          </Tabs.Panel>
        </Box>
      </Tabs>
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
