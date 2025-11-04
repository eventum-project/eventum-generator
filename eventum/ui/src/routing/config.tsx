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
const InstancesPage = lazy(
  () =>
    import('@/pages/InstancesPage') as Promise<{
      default: React.ComponentType;
    }>
);
const ProjectsPage = lazy(
  () =>
    import('@/pages/ProjectsPage') as Promise<{
      default: React.ComponentType;
    }>
);
const StartupPage = lazy(
  () =>
    import('@/pages/StartupPage') as Promise<{
      default: React.ComponentType;
    }>
);
const SecretsPage = lazy(
  () =>
    import('@/pages/SecretsPage') as Promise<{
      default: React.ComponentType;
    }>
);
const SettingsPage = lazy(
  () =>
    import('@/pages/SettingsPage') as Promise<{
      default: React.ComponentType;
    }>
);
const ManagementPage = lazy(
  () =>
    import('@/pages/ManagementPage') as Promise<{
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
    path: ROUTE_PATHS.INSTANCES,
    element: (
      <PrivateRoute>
        <AppLayout>
          <InstancesPage />
        </AppLayout>
      </PrivateRoute>
    ),
  },
  {
    path: ROUTE_PATHS.PROJECTS,
    element: (
      <PrivateRoute>
        <AppLayout>
          <ProjectsPage />
        </AppLayout>
      </PrivateRoute>
    ),
  },
  {
    path: ROUTE_PATHS.STARTUP,
    element: (
      <PrivateRoute>
        <AppLayout>
          <StartupPage />
        </AppLayout>
      </PrivateRoute>
    ),
  },
  {
    path: ROUTE_PATHS.SECRETS,
    element: (
      <PrivateRoute>
        <AppLayout>
          <SecretsPage />
        </AppLayout>
      </PrivateRoute>
    ),
  },
  {
    path: ROUTE_PATHS.SETTINGS,
    element: (
      <PrivateRoute>
        <AppLayout>
          <SettingsPage />
        </AppLayout>
      </PrivateRoute>
    ),
  },
  {
    path: ROUTE_PATHS.MANAGEMENT,
    element: (
      <PrivateRoute>
        <AppLayout>
          <ManagementPage />
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
