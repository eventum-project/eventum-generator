import { Box, Stack, Tabs } from '@mantine/core';
import { FC } from 'react';

import { EditorTab } from './EditorTab';

export const TemplateEventPluginWorkspace: FC = () => {
  return (
    <Stack>
      <Tabs defaultValue="editor">
        <Tabs.List>
          <Tabs.Tab value="editor">Editor</Tabs.Tab>
          <Tabs.Tab value="debugger">Debugger</Tabs.Tab>
        </Tabs.List>

        <Box mt="md">
          <Tabs.Panel value="editor">
            <EditorTab />
          </Tabs.Panel>
          <Tabs.Panel value="debugger">debugger</Tabs.Panel>
        </Box>
      </Tabs>
    </Stack>
  );
};
