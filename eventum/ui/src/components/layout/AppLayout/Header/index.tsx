import { Box, Group, Image, Title } from '@mantine/core';
import { modals } from '@mantine/modals';
import { FC } from 'react';
import { useNavigate } from 'react-router-dom';

import { AboutModal } from './AboutModal';
import { UserMenu } from './UserMenu';
import { AppBreadcrumbs } from '@/components/layout/AppLayout/Header/AppBreadcrumbs';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { ROUTE_PATHS } from '@/routing/paths';

interface HeaderProps {
  username: string;
  onSignOut: () => void;
}

export const Header: FC<HeaderProps> = ({ username, onSignOut }) => {
  const navigate = useNavigate();

  return (
    <Group justify="space-between" h="100%" ml="xs" mr="xl">
      <Group>
        <Group
          gap="xs"
          onClick={() => void navigate(ROUTE_PATHS.MAIN)}
          style={{ cursor: 'pointer' }}
        >
          <Box>
            <Image
              src="/logo.svg"
              alt="Eventum Logo"
              h={27}
              w="auto"
              fit="contain"
              mx="auto"
              draggable={false}
            />
          </Box>
          <Box>
            <Title fz="lg" fw="normal">
              Eventum Studio
            </Title>
          </Box>
        </Group>
        <AppBreadcrumbs />
      </Group>
      <Group>
        <ThemeToggle />
        <Box ml="sm">
          <UserMenu
            username={username}
            onSignOut={onSignOut}
            onOpenAboutModal={() => {
              modals.open({
                title: 'About Eventum',
                children: <AboutModal />,
              });
            }}
          />
        </Box>
      </Group>
    </Group>
  );
};
