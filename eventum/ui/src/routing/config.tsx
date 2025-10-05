import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';

import { ROUTE_PATHS } from './paths';
import AppLayout from '@/components/layout/AppLayout';
import BlankLayout from '@/components/layout/BlankLayout';
import FooterOnlyLayout from '@/components/layout/FooterOnlyLayout';

const ConnectPage = lazy(
  () =>
    import('@/pages/ConnectPage') as Promise<{
      default: React.ComponentType;
    }>
);
const MainPage = lazy(
  () =>
    import('@/pages/MainPage') as Promise<{
      default: React.ComponentType;
    }>
);
const NotFoundPage = lazy(
  () =>
    import('@/pages/NotFoundPage') as Promise<{
      default: React.ComponentType;
    }>
);

export const routes: RouteObject[] = [
  {
    path: ROUTE_PATHS.CONNECT,
    element: (
      <FooterOnlyLayout>
        <ConnectPage />
      </FooterOnlyLayout>
    ),
  },
  {
    path: ROUTE_PATHS.MAIN,
    element: (
      <AppLayout>
        <MainPage />
      </AppLayout>
    ),
  },
  {
    path: '*',
    element: (
      <BlankLayout>
        <NotFoundPage />
      </BlankLayout>
    ),
  },
];
