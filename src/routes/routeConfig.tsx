import AppLayout from '@/components/layout/AppLayout';
import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';

import { ROUTE_PATHS } from './routePaths';

const GeneratorsPage = lazy(() => import('@/pages/Generators'));
const NotFoundPage = lazy(() => import('@/pages/NotFound'));

export const routes: RouteObject[] = [
  {
    path: ROUTE_PATHS.GENERATORS,
    element: (
      <AppLayout>
        <GeneratorsPage />
      </AppLayout>
    ),
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
];
