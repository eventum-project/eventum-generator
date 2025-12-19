import { Box, Stack, Tabs } from '@mantine/core';
import { FC } from 'react';

import { DebuggerTab } from './common/DebuggerTab';

export const ReplayEventPluginWorkspace: FC = () => {
  return (
    <Stack>
      <Tabs defaultValue="debugger">
        <Tabs.List>
          <Tabs.Tab value="debugger">Debugger</Tabs.Tab>
        </Tabs.List>

        <Box mt="md">
          <Tabs.Panel value="debugger">
            <DebuggerTab />
          </Tabs.Panel>
        </Box>
      </Tabs>
    </Stack>
  );
};
