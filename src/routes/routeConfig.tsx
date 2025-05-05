// src/routes/routeConfig.tsx
import Layout from '@/layout/Layout';
import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';

import { ROUTE_PATHS } from './routePaths';

const GeneratorInstancesPage = lazy(() => import('@/pages/GeneratorInstances'));
const NotFoundPage = lazy(() => import('@/pages/NotFound'));

export const routes: RouteObject[] = [
  {
    path: ROUTE_PATHS.GENERATOR_INSTANCES,
    element: (
      <Layout>
        <GeneratorInstancesPage />
      </Layout>
    ),
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
];
