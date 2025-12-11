import { autocompletion } from '@codemirror/autocomplete';
import { jinja } from '@codemirror/lang-jinja';
import { useMantineColorScheme } from '@mantine/core';
import { vscodeDark, vscodeLight } from '@uiw/codemirror-theme-vscode';
import CodeMirror from '@uiw/react-codemirror';
import { FC } from 'react';

import { jinjaCompletion } from './completions';

export const TemplateEditor: FC = () => {
  const { colorScheme } = useMantineColorScheme();

  return (
    <CodeMirror
      height="600px"
      extensions={[
        jinja(),
        autocompletion({
          override: [jinjaCompletion],
        }),
      ]}
      theme={colorScheme === 'dark' ? vscodeDark : vscodeLight}
    />
  );
};
