/* eslint-disable check-file/filename-naming-convention */
import { lazy } from 'react';

import { type PathRouteProps } from 'react-router-dom';

const ProtectedHistoryPage = lazy(() =>
  import('./pages/History').then((mod) => ({ default: mod.ProtectedHistoryPage }))
);

/**
 * These routes will be merged with the rest of the Content Manager routes
 */
const routes: PathRouteProps[] = [
  {
    path: ':collectionType/:slug/:id/history',
    Component: ProtectedHistoryPage,
  },
  {
    path: ':collectionType/:slug/history',
    Component: ProtectedHistoryPage,
  },
];

export { routes };
