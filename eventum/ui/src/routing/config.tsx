import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';

import { PrivateRoute, SignInRoute } from './guards';
import { ROUTE_PATHS } from './paths';
import AppLayout from '@/components/layout/AppLayout';
import BlankLayout from '@/components/layout/BlankLayout';
import FooterOnlyLayout from '@/components/layout/FooterOnlyLayout';

const SignInPage = lazy(
  () =>
    import('@/pages/SignInPage') as Promise<{
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
    path: ROUTE_PATHS.SIGNIN,
    element: (
      <SignInRoute>
        <FooterOnlyLayout>
          <SignInPage />
        </FooterOnlyLayout>
      </SignInRoute>
    ),
  },
  {
    path: ROUTE_PATHS.MAIN,
    element: (
      <PrivateRoute>
        <AppLayout>
          <MainPage />
        </AppLayout>
      </PrivateRoute>
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
