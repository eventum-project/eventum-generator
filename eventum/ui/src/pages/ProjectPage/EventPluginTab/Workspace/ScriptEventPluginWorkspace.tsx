import { Box, Stack, Tabs } from '@mantine/core';
import { FC } from 'react';

import { EditorTab } from '../../common/EditorTab';
import { DebuggerTab } from './common/DebuggerTab';

export const ScriptEventPluginWorkspace: FC = () => {
  return (
    <Stack>
      <Tabs defaultValue="editor">
        <Tabs.List>
          <Tabs.Tab value="debugger">Debugger</Tabs.Tab>
          <Tabs.Tab value="editor">Editor</Tabs.Tab>
        </Tabs.List>

        <Box mt="md">
          <Tabs.Panel value="debugger">
            <DebuggerTab />
          </Tabs.Panel>
          <Tabs.Panel value="editor">
            <EditorTab />
          </Tabs.Panel>
        </Box>
      </Tabs>
    </Stack>
  );
};
