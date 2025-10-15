'use client';

import { AppShell, Box, Divider, Group, NavLink, Stack } from '@mantine/core';
import {
  IconBook,
  IconBug,
  IconFolder,
  IconHome,
  IconLock,
  IconPlayerPlay,
  IconRepeat,
  IconSettings,
  IconUsersGroup,
} from '@tabler/icons-react';
import { useLocation, useNavigate } from 'react-router-dom';

import { LINKS } from '@/routing/links';
import { ROUTE_PATHS } from '@/routing/paths';

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <AppShell
      padding="md"
      header={{ height: 60 }}
      navbar={{
        width: 220,
        breakpoint: 'sm',
      }}
    >
      <AppShell.Header>
        <Group justify="space-between">
          <Group>
            <Box>Logo</Box>
          </Group>
          <Group>
            <Box>Username</Box>
            <Box>Log Out</Box>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar>
        <Stack gap="0" h="100%" justify="space-between">
          <Box>
            <NavLink
              label="Overview"
              leftSection={<IconHome size="20px" />}
              active={location.pathname === ROUTE_PATHS.MAIN}
              onClick={() => void navigate(ROUTE_PATHS.MAIN)}
            />
            <Divider />
            <NavLink label="Generators" defaultOpened>
              <NavLink
                label="Instances"
                leftSection={<IconPlayerPlay size="20px" />}
                active={location.pathname === ROUTE_PATHS.INSTANCES}
                onClick={() => void navigate(ROUTE_PATHS.INSTANCES)}
              />
              <NavLink
                label="Projects"
                leftSection={<IconFolder size="20px" />}
                active={location.pathname === ROUTE_PATHS.PROJECTS}
                onClick={() => void navigate(ROUTE_PATHS.PROJECTS)}
              />
              <NavLink
                label="Startup"
                leftSection={<IconRepeat size="20px" />}
                active={location.pathname === ROUTE_PATHS.STARTUP}
                onClick={() => void navigate(ROUTE_PATHS.STARTUP)}
              />
            </NavLink>
            <Divider />
            <NavLink label="Management" defaultOpened>
              <NavLink
                label="Secrets"
                leftSection={<IconLock size="20px" />}
                active={location.pathname === ROUTE_PATHS.SECRETS}
                onClick={() => void navigate(ROUTE_PATHS.SECRETS)}
              />
              <NavLink
                label="Settings"
                leftSection={<IconSettings size="20px" />}
                active={location.pathname === ROUTE_PATHS.SETTINGS}
                onClick={() => void navigate(ROUTE_PATHS.SETTINGS)}
              />
            </NavLink>
          </Box>
          <Box>
            <NavLink
              label="Documentation"
              leftSection={<IconBook size="20px" />}
              href={LINKS.DOCUMENTATION}
              target="_blank"
            />
            <NavLink
              label="Join the community"
              leftSection={<IconUsersGroup size="20px" />}
              href={LINKS.TG_COMMUNITY_GROUP}
              target="_blank"
            />
            <NavLink
              label="Report an issue"
              leftSection={<IconBug size="20px" />}
              href={LINKS.GITHUB_ISSUES}
              target="_blank"
            />
          </Box>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
