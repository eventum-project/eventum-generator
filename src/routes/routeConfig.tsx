import AppLayout from '@/components/layout/AppLayout';
import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';

import { ROUTE_PATHS } from './routePaths';

const OverviewPage = lazy(() => import('@/pages/Overview'));
const GeneratorsPage = lazy(() => import('@/pages/Generators'));
const TagsPage = lazy(() => import('@/pages/Tags'));
const SecretsPage = lazy(() => import('@/pages/Secrets'));
const SettingsPage = lazy(() => import('@/pages/Settings'));
const NotFoundPage = lazy(() => import('@/pages/NotFound'));

export const routes: RouteObject[] = [
  {
    path: ROUTE_PATHS.OVERVIEW,
    element: (
      <AppLayout>
        <OverviewPage />
      </AppLayout>
    ),
  },
  {
    path: ROUTE_PATHS.GENERATORS,
    element: (
      <AppLayout>
        <GeneratorsPage />
      </AppLayout>
    ),
  },
  {
    path: ROUTE_PATHS.TAGS,
    element: (
      <AppLayout>
        <TagsPage />
      </AppLayout>
    ),
  },
  {
    path: ROUTE_PATHS.SECRETS,
    element: (
      <AppLayout>
        <SecretsPage />
      </AppLayout>
    ),
  },
  {
    path: ROUTE_PATHS.SETTINGS,
    element: (
      <AppLayout>
        <SettingsPage />
      </AppLayout>
    ),
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
];
