import { autocompletion } from '@codemirror/autocomplete';
import { jinja } from '@codemirror/lang-jinja';
import { keymap } from '@codemirror/view';
import {
  Alert,
  Box,
  Skeleton,
  Stack,
  useMantineColorScheme,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertSquareRounded } from '@tabler/icons-react';
import { vscodeDark, vscodeLight } from '@uiw/codemirror-theme-vscode';
import CodeMirror from '@uiw/react-codemirror';
import { FC, useEffect, useState } from 'react';

import { jinjaCompletion } from './completions';
import {
  useGeneratorFileContent,
  usePutGeneratorFileMutation,
} from '@/api/hooks/useGeneratorConfigs';
import { ShowErrorDetailsAnchor } from '@/components/ui/ShowErrorDetailsAnchor';
import { useProjectName } from '@/pages/ProjectPage/hooks/useProjectName';

interface TemplateEditorProps {
  templatePath: string;
  setSaved: (saved: boolean) => void;
}

export const TemplateEditor: FC<TemplateEditorProps> = ({
  templatePath,
  setSaved,
}) => {
  const { colorScheme } = useMantineColorScheme();
  const { projectName } = useProjectName();
  const {
    data: templateContent,
    isLoading: isContentLoading,
    isError: isContentError,
    error: contentError,
    isSuccess: isContentSuccess,
  } = useGeneratorFileContent(projectName, templatePath);
  const updateFile = usePutGeneratorFileMutation();

  const [content, setContent] = useState<string>('');
  const [isTouched, setTouched] = useState(false);

  useEffect(() => {
    if (isContentSuccess) {
      setContent(templateContent);
      setTouched(false);
      setSaved(true);
    }
  }, [setSaved, templateContent, isContentSuccess]);

  useEffect(() => {
    if (isTouched) {
      setSaved(false);
    }
  }, [setSaved, isTouched]);

  function handleSave() {
    updateFile.mutate(
      { name: projectName, filepath: templatePath, content: content },
      {
        onSuccess: () => {
          setSaved(true);
          setTouched(false);
        },
        onError: (error) => {
          notifications.show({
            title: 'Error',
            message: (
              <>
                Failed to save file
                <ShowErrorDetailsAnchor error={error} prependDot />
              </>
            ),
            color: 'red',
          });
        },
      }
    );
  }

  const saveKeymap = keymap.of([
    {
      key: 'Mod-s',
      preventDefault: true,
      run: () => {
        handleSave();
        return true;
      },
    },
  ]);

  if (isContentLoading) {
    return <Skeleton h="60vh" />;
  }

  if (isContentError) {
    return (
      <Alert
        variant="default"
        icon={<Box c="red" component={IconAlertSquareRounded}></Box>}
        title="Failed to load template content"
      >
        {contentError.message}
        <ShowErrorDetailsAnchor error={contentError} prependDot />
      </Alert>
    );
  }

  if (isContentSuccess) {
    return (
      <Stack gap="xs">
        <CodeMirror
          value={content}
          onChange={(value) => {
            setContent(value);

            if (!isTouched) {
              setTouched(true);
            }
          }}
          height="65vh"
          extensions={[
            jinja(),
            autocompletion({
              override: [jinjaCompletion],
            }),
            saveKeymap,
          ]}
          theme={colorScheme === 'dark' ? vscodeDark : vscodeLight}
        />
      </Stack>
    );
  }

  return null;
};
