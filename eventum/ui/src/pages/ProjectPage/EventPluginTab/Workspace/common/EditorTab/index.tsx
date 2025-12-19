import {
  Alert,
  Box,
  Center,
  Divider,
  Group,
  ScrollArea,
  SegmentedControl,
  Skeleton,
  Stack,
  Text,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import {
  IconAlertSquareRounded,
  IconBrandPython,
  IconPointFilled,
} from '@tabler/icons-react';
import { FC, useMemo, useState } from 'react';

import { FileEditor, FileEditorProps } from './FileEditor';
import { useGeneratorFileTree } from '@/api/hooks/useGeneratorConfigs';
import { flattenFileTree } from '@/api/routes/generator-configs/modules/file-tree';
import { ShowErrorDetailsAnchor } from '@/components/ui/ShowErrorDetailsAnchor';
import { IconJinja } from '@/components/ui/icons/IconJinja';
import { useProjectName } from '@/pages/ProjectPage/hooks/useProjectName';

interface EditorTabProps {
  fileType: FileEditorProps['fileType'];
}

export const EditorTab: FC<EditorTabProps> = ({ fileType }) => {
  const { projectName } = useProjectName();
  const {
    data: fileTree,
    isLoading: isFileTreeLoading,
    isError: isFileTreeError,
    error: fileTreeError,
    isSuccess: isFileTreeSuccess,
  } = useGeneratorFileTree(projectName);

  const [selectedFile, setSelectedFile] = useState<string | undefined>();

  const fileList = useMemo(() => {
    if (isFileTreeSuccess) {
      const files = flattenFileTree(fileTree, true).filter((item) =>
        item.endsWith(fileType === 'jinja' ? '.jinja' : '.py')
      );

      setSelectedFile((prevValue) => prevValue ?? files[0]);

      return files;
    } else {
      return [];
    }
  }, [fileType, fileTree, isFileTreeSuccess, setSelectedFile]);
  const [isSelectedFileSaved, setSelectedFileSaved] = useState(true);

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

      {isFileTreeSuccess && fileList.length > 0 ? (
        <Stack gap="4px">
          <ScrollArea type="hover" offsetScrollbars="x" scrollbarSize="5px">
            <SegmentedControl
              data={fileList.map((item) => ({
                label: (
                  <Center>
                    <Group gap="4px" wrap="nowrap">
                      {fileType === 'jinja' && <IconJinja size={14} />}
                      {fileType === 'python' && <IconBrandPython size={14} />}
                      <span>{item}</span>
                      {!isSelectedFileSaved && item === selectedFile && (
                        <IconPointFilled size={20} />
                      )}
                    </Group>
                  </Center>
                ),
                value: item,
              }))}
              value={selectedFile}
              onChange={(value) => {
                if (!isSelectedFileSaved) {
                  modals.openConfirmModal({
                    title: 'Unsaved changes',
                    children: (
                      <Text size="sm">
                        All unsaved changes in <b>{selectedFile}</b> will be
                        lost. Do you want to continue?
                      </Text>
                    ),
                    labels: { confirm: 'Confirm', cancel: 'Cancel' },
                    onConfirm: () => {
                      setSelectedFileSaved(true);
                      setSelectedFile(value);
                    },
                  });
                } else {
                  setSelectedFile(value);
                }
              }}
            />
          </ScrollArea>
          {selectedFile !== undefined ? (
            <FileEditor
              fileType={fileType}
              filePath={selectedFile}
              setSaved={setSelectedFileSaved}
              key={selectedFile}
            />
          ) : (
            <Stack>
              <Divider />
              <Center>
                <Text size="sm" c="gray.6">
                  No file selected
                </Text>
              </Center>
            </Stack>
          )}
        </Stack>
      ) : (
        <Center>
          <Text size="sm" c="gray.6">
            No files
          </Text>
        </Center>
      )}
    </Stack>
  );
};
