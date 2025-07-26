import { Center, Loader } from '@mantine/core';
import { Suspense } from 'react';
import { useRoutes } from 'react-router-dom';

import { routes } from './config';

function RouteFallback() {
  return (
    <Center h="100vh" w="100vw">
      <Loader size="lg" />
    </Center>
  );
}

export default function AppRouter() {
  return <Suspense fallback={<RouteFallback />}>{useRoutes(routes)}</Suspense>;
}
