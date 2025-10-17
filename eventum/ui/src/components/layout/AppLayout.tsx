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

import ThemeToggle from '@/components/ThemeToggle';
import { LINKS } from '@/routing/links';
import { ROUTE_PATHS } from '@/routing/paths';

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const location = useLocation();
  const navigate = useNavigate();

  const navigationData = [
    {
      groupName: 'Generators',
      items: [
        {
          label: 'Instances',
          icon: IconPlayerPlay,
          pathname: ROUTE_PATHS.INSTANCES,
        },
        {
          label: 'Projects',
          icon: IconFolder,
          pathname: ROUTE_PATHS.PROJECTS,
        },
        {
          label: 'Startup',
          icon: IconRepeat,
          pathname: ROUTE_PATHS.STARTUP,
        },
      ],
    },
    {
      groupName: 'Management',
      items: [
        {
          label: 'Secrets',
          icon: IconLock,
          pathname: ROUTE_PATHS.SECRETS,
        },
        {
          label: 'Settings',
          icon: IconSettings,
          pathname: ROUTE_PATHS.SETTINGS,
        },
      ],
    },
  ];

  const bottomNavigationData = [
    {
      label: 'Documentation',
      icon: IconBook,
      link: LINKS.DOCUMENTATION,
    },
    {
      label: 'Join the community',
      icon: IconUsersGroup,
      link: LINKS.TG_COMMUNITY_GROUP,
    },
    {
      label: 'Report an issue',
      icon: IconBug,
      link: LINKS.GITHUB_ISSUES,
    },
  ];
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
            <ThemeToggle />
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
              leftSection={<IconHome size="19px" />}
              active={location.pathname === ROUTE_PATHS.MAIN}
              onClick={() => void navigate(ROUTE_PATHS.MAIN)}
            />
            {navigationData.map((group) => (
              <>
                <Divider />
                <NavLink
                  label={group.groupName}
                  key={group.groupName}
                  defaultOpened
                >
                  {group.items.map((item) => (
                    <NavLink
                      label={item.label}
                      key={item.label}
                      leftSection={<item.icon size="19px" />}
                      active={location.pathname == item.pathname}
                      onClick={() => void navigate(item.pathname)}
                    />
                  ))}
                </NavLink>
              </>
            ))}
          </Box>
          <Box>
            {bottomNavigationData.map((item) => (
              <NavLink
                label={item.label}
                key={item.label}
                leftSection={<item.icon size="19px" />}
                href={item.link}
                target="_blank"
              />
            ))}
          </Box>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
