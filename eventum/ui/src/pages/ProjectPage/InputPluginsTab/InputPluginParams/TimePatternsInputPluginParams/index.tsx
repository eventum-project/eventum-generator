import {
  ActionIcon,
  Alert,
  Box,
  Group,
  MultiSelect,
  Select,
  Skeleton,
  Stack,
  TagsInput,
  Text,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { modals } from '@mantine/modals';
import { IconAlertSquareRounded, IconPlus } from '@tabler/icons-react';
import { FC, useState } from 'react';

import { useProjectName } from '../../../hooks/useProjectName';
import { AddNewPatternModal } from './AddNewPatternModal';
import { TimePatternParams } from './TimePatternParams';
import { useGeneratorFileTree } from '@/api/hooks/useGeneratorConfigs';
import { flattenFileTree } from '@/api/routes/generator-configs/modules/file-tree';
import { TimePatternsInputPluginConfig } from '@/api/routes/generator-configs/schemas/plugins/input/configs/time_patterns';
import { LabelWithTooltip } from '@/components/ui/LabelWithTooltip';
import { ShowErrorDetailsAnchor } from '@/components/ui/ShowErrorDetailsAnchor';
import { ProjectNameProvider } from '@/pages/ProjectPage/context/ProjectNameContext';

interface TimePatternsInputPluginParamsProps {
  initialConfig: TimePatternsInputPluginConfig;
  onChange: (config: TimePatternsInputPluginConfig) => void;
}

export const TimePatternsInputPluginParams: FC<
  TimePatternsInputPluginParamsProps
> = ({ initialConfig, onChange }) => {
  const form = useForm<TimePatternsInputPluginConfig>({
    initialValues: initialConfig,
    onValuesChange: (values) => {
      onChange(values);
    },
    validate: {
      patterns: (value) => {
        if (value.length === 0) {
          return 'At least one pattern is required';
        }

        return null;
      },
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

  const [selectedTimePattern, setSelectedTimePattern] = useState<string | null>(
    null
  );

  if (isFileTreeLoading) {
    return (
      <Stack>
        <Skeleton h="xl" animate visible />
        <Skeleton h="xl" animate visible />
        <Skeleton h="200px" animate visible mt="xs" />
      </Stack>
    );
  }

  if (isFileTreeError) {
    return (
      <Alert
        variant="default"
        icon={<Box c="red" component={IconAlertSquareRounded}></Box>}
        title="Failed to load list of project files"
      >
        {fileTreeError.message}
        <ShowErrorDetailsAnchor error={fileTreeError} prependDot />
      </Alert>
    );
  }

  if (isFileTreeSuccess) {
    const filesList = flattenFileTree(fileTree, true);

    return (
      <Stack>
        <MultiSelect
          label={
            <LabelWithTooltip
              label="Patterns"
              tooltip="File paths to time pattern configurations."
            />
          }
          data={filesList}
          clearable
          searchable
          hidePickedOptions
          {...form.getInputProps('patterns', { type: 'input' })}
        />
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

        <Stack gap="4px">
          <Text size="sm" fw="bold">
            Time patterns
          </Text>
          <Stack>
            <Group align="end" wrap="nowrap" gap="xs">
              <Select
                label="Select pattern to edit"
                data={filesList}
                searchable
                nothingFoundMessage="No files found"
                placeholder="time pattern file"
                w="100%"
                value={selectedTimePattern}
                onChange={setSelectedTimePattern}
                clearable
              />
              <ActionIcon
                title="Add new pattern"
                size="lg"
                variant="default"
                onClick={() => {
                  modals.open({
                    title: 'Add new time pattern',
                    children: (
                      <ProjectNameProvider initialProjectName={projectName}>
                        <AddNewPatternModal
                          existingFiles={filesList}
                          onAddNewPattern={(filePath) => {
                            const normalizedPath = filePath.startsWith('./')
                              ? filePath
                              : `./${filePath}`;
                            setSelectedTimePattern(normalizedPath);
                          }}
                        />
                      </ProjectNameProvider>
                    ),
                    size: 'md',
                  });
                }}
              >
                <IconPlus size={20} />
              </ActionIcon>
            </Group>
            {selectedTimePattern && (
              <TimePatternParams filePath={selectedTimePattern} />
            )}
          </Stack>
        </Stack>
      </Stack>
    );
  }

  return <></>;
};
