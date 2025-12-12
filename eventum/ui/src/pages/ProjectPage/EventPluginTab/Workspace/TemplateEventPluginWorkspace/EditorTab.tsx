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
import { IconAlertSquareRounded, IconPointFilled } from '@tabler/icons-react';
import { FC, useMemo, useState } from 'react';

import { TemplateEditor } from './TemplateEditor';
import { useGeneratorFileTree } from '@/api/hooks/useGeneratorConfigs';
import { flattenFileTree } from '@/api/routes/generator-configs/modules/file-tree';
import { ShowErrorDetailsAnchor } from '@/components/ui/ShowErrorDetailsAnchor';
import { useProjectName } from '@/pages/ProjectPage/hooks/useProjectName';

export const EditorTab: FC = () => {
  const { projectName } = useProjectName();
  const {
    data: fileTree,
    isLoading: isFileTreeLoading,
    isError: isFileTreeError,
    error: fileTreeError,
    isSuccess: isFileTreeSuccess,
  } = useGeneratorFileTree(projectName);

  const [selectedTemplate, setSelectedTemplate] = useState<
    string | undefined
  >();

  const templateFileList = useMemo(() => {
    if (isFileTreeSuccess) {
      const files = flattenFileTree(fileTree, true).filter((item) =>
        item.endsWith('.jinja')
      );

      setSelectedTemplate((prevValue) => prevValue ?? files[0]);

      return files;
    } else {
      return [];
    }
  }, [fileTree, isFileTreeSuccess, setSelectedTemplate]);
  const [isSelectedTemplateSaved, setSelectedTemplateSaved] = useState(true);

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
        <Stack gap="4px">
          <ScrollArea type="hover" offsetScrollbars="x" scrollbarSize="5px">
            <SegmentedControl
              data={templateFileList.map((item) => ({
                label: (
                  <Center>
                    <Group gap="4px" wrap="nowrap">
                      <span>{item}</span>
                      {!isSelectedTemplateSaved &&
                        item === selectedTemplate && (
                          <IconPointFilled size={20} />
                        )}
                    </Group>
                  </Center>
                ),
                value: item,
              }))}
              value={selectedTemplate}
              onChange={(value) => {
                if (!isSelectedTemplateSaved) {
                  modals.openConfirmModal({
                    title: 'Unsaved changes',
                    children: (
                      <Text size="sm">
                        All unsaved changes in <b>{selectedTemplate}</b> will be
                        lost. Do you want to continue?
                      </Text>
                    ),
                    labels: { confirm: 'Confirm', cancel: 'Cancel' },
                    onConfirm: () => {
                      setSelectedTemplateSaved(true);
                      setSelectedTemplate(value);
                    },
                  });
                } else {
                  setSelectedTemplate(value);
                }
              }}
            />
          </ScrollArea>
          {selectedTemplate !== undefined ? (
            <TemplateEditor
              templatePath={selectedTemplate}
              setSaved={setSelectedTemplateSaved}
              key={selectedTemplate}
            />
          ) : (
            <>
              <Divider />
              <Center>
                <Text size="sm" c="gray.6">
                  No template
                </Text>
              </Center>
            </>
          )}
        </Stack>
      )}
    </Stack>
  );
};
