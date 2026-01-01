import { Center, Loader } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';

import { ROUTE_PATHS } from './paths';
import { useCurrentUser } from '@/api/hooks/useAuth';

// eslint-disable-next-line sonarjs/function-return-type
export function PrivateRoute({
  children,
}: Readonly<{ children: React.ReactNode }>): React.ReactNode {
  const { isLoading, isSuccess, isError } = useCurrentUser();

  useEffect(() => {
    if (isError) {
      notifications.show({
        title: 'Authorization required',
        message: 'You are not authorized or your session has expired',
        color: 'red',
      });
    }
  }, [isError]);

  if (isLoading)
    return (
      <Center h="100vh" w="100vw">
        <Loader size="lg" />
      </Center>
    );

  if (isSuccess) return children;

  return <Navigate to={ROUTE_PATHS.SIGNIN} replace />;
}

// eslint-disable-next-line sonarjs/function-return-type
export function SignInRoute({
  children,
}: Readonly<{ children: React.ReactNode }>): React.ReactNode {
  const { isSuccess, isLoading } = useCurrentUser();

  useEffect(() => {
    if (isSuccess) {
      notifications.show({
        title: 'Signed in',
        message: 'You are already signed in',
        color: 'green',
      });
    }
  }, [isSuccess]);

  if (isLoading)
    return (
      <Center h="100vh" w="100vw">
        <Loader size="lg" />
      </Center>
    );

  if (isSuccess) return <Navigate to={ROUTE_PATHS.ROOT} replace />;

  return children;
}
