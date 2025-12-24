import { Alert, Box, Select, Skeleton, Stack } from '@mantine/core';
import { IconAlertSquareRounded } from '@tabler/icons-react';
import { FC, useMemo } from 'react';

import { useGeneratorFileTree } from '@/api/hooks/useGeneratorConfigs';
import { flattenFileTree } from '@/api/routes/generator-configs/modules/file-tree';
import { LabelWithTooltip } from '@/components/ui/LabelWithTooltip';
import { ShowErrorDetailsAnchor } from '@/components/ui/ShowErrorDetailsAnchor';
import { useProjectName } from '@/pages/ProjectPage/hooks/useProjectName';

interface TemplateFilesSelectProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

export const TemplateFilesSelect: FC<TemplateFilesSelectProps> = ({
  value,
  onChange,
}) => {
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
      return flattenFileTree(fileTree, true).filter((file) =>
        file.endsWith('.jinja')
      );
    } else {
      return [];
    }
  }, [fileTree, isFileTreeSuccess]);

  return (
    <>
      {isFileTreeLoading && (
        <Stack>
          <Skeleton h="200px" animate visible />
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
              label="Template path"
              tooltip="Path to file with template content"
            />
          }
          data={filesList}
          clearable
          searchable
          value={value}
          onChange={onChange}
          error={!value ? 'Template path is required' : null}
        />
      )}
    </>
  );
};
