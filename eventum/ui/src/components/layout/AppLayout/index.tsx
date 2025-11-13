import { AppShell, Center, Loader } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Outlet, useNavigate } from 'react-router-dom';

import { Header } from './Header';
import { Navbar } from './Navbar';
import { useCurrentUser, useLogoutMutation } from '@/api/hooks/useAuth';
import { ROUTE_PATHS } from '@/routing/paths';

export default function AppLayout() {
  const navigate = useNavigate();
  const {
    data: user,
    isLoading: isUserLoading,
    isSuccess: isUserSuccess,
  } = useCurrentUser();
  const logout = useLogoutMutation();

  if (isUserLoading) {
    return (
      <Center>
        <Loader size="lg" />
      </Center>
    );
  }

  if (!isUserSuccess) {
    void navigate(ROUTE_PATHS.SIGNIN);
    return;
  }

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
        <Header
          username={user}
          onSignOut={() =>
            logout.mutate(undefined, {
              onSuccess: () => void navigate(ROUTE_PATHS.SIGNIN),
              onError: (error) =>
                notifications.show({
                  title: 'Sign out failed',
                  message: error.message,
                  color: 'red',
                }),
            })
          }
        />
      </AppShell.Header>

      <AppShell.Navbar>
        <Navbar />
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
