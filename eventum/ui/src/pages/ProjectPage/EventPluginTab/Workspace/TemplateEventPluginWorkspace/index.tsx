import { Box, Stack, Tabs } from '@mantine/core';
import { FC } from 'react';

import { DebuggerTab } from '../common/DebuggerTab';
import { EditorTab } from '../common/EditorTab';
import { StateTab } from './StateTab';

export const TemplateEventPluginWorkspace: FC = () => {
  return (
    <Stack>
      <Tabs defaultValue="editor">
        <Tabs.List>
          <Tabs.Tab value="editor">Editor</Tabs.Tab>
          <Tabs.Tab value="debugger">Debugger</Tabs.Tab>
          <Tabs.Tab value="state">State</Tabs.Tab>
        </Tabs.List>

        <Box mt="md">
          <Tabs.Panel value="editor">
            <EditorTab fileType="jinja" />
          </Tabs.Panel>
          <Tabs.Panel value="debugger">
            <DebuggerTab />
          </Tabs.Panel>
          <Tabs.Panel value="state">
            <StateTab />
          </Tabs.Panel>
        </Box>
      </Tabs>
    </Stack>
  );
};
