import { Box, Divider, NavLink, Stack } from '@mantine/core';
import { IconHome } from '@tabler/icons-react';
import { FC } from 'react';
import { useNavigate } from 'react-router-dom';

import { BOTTOM_NAVIGATION_DATA, NAVIGATION_DATA } from './data';
import { ROUTE_PATHS } from '@/routing/paths';

export const Navbar: FC = () => {
  const navigate = useNavigate();

  return (
    <Stack gap="0" h="100%" justify="space-between">
      <Box>
        <NavLink
          label="Overview"
          leftSection={<IconHome size="19px" />}
          active={location.pathname === ROUTE_PATHS.MAIN}
          onClick={() => void navigate(ROUTE_PATHS.MAIN)}
        />
        {NAVIGATION_DATA.map((group) => (
          <Box key={group.groupName}>
            <Divider />
            <NavLink label={group.groupName} defaultOpened>
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
          </Box>
        ))}
      </Box>
      <Box>
        {BOTTOM_NAVIGATION_DATA.map((item) => (
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
  );
};
