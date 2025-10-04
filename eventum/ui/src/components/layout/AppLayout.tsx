'use client';

import {
  ActionIcon,
  AppShell,
  Button,
  Group,
  Modal,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { IconPower, IconSettings } from '@tabler/icons-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ROUTE_PATHS } from '@/routing/paths';

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [settingsOpened, setSettingsOpened] = useState(false);
  const [serverSetting, setServerSetting] = useState('');
  const navigate = useNavigate();

  const handleDisconnect = () => {
    navigate(ROUTE_PATHS.CONNECT);
  };

  const handleSaveSettings = () => {
    setSettingsOpened(false);
  };

  return (
    <>
      <AppShell padding="60px">
        <AppShell.Header
          px="md"
          style={{
            padding: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontWeight: 'bold' }}>Logo</div>

          <Group>
            <ActionIcon
              onClick={() => setSettingsOpened(true)}
              title="Settings"
            >
              <IconSettings size={20} />
            </ActionIcon>
            <ActionIcon
              color="red"
              variant="filled"
              onClick={handleDisconnect}
              title="Disconnect"
            >
              <IconPower size={20} />
            </ActionIcon>
          </Group>
        </AppShell.Header>

        <AppShell.Main>{children}</AppShell.Main>
      </AppShell>

      <Modal
        opened={settingsOpened}
        onClose={() => setSettingsOpened(false)}
        title="Server Settings"
        centered
      >
        <Stack>
          <Text>Configure your server settings here.</Text>
          <TextInput
            label="Example setting"
            value={serverSetting}
            onChange={(e) => setServerSetting(e.currentTarget.value)}
          />
          <Group mt="md">
            <Button onClick={handleSaveSettings}>Save</Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
