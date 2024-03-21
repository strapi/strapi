/* eslint-disable check-file/filename-naming-convention */
import { useLocation, type RouteObject, matchRoutes } from 'react-router-dom';

/**
 * These routes will be merged with the rest of the Content Manager routes
 */
const routes: RouteObject[] = [
  {
    path: ':collectionType/:slug/:id/history',
    lazy: async () => {
      const { ProtectedHistoryPage } = await import('./pages/History');

      return {
        Component: ProtectedHistoryPage,
      };
    },
  },
  {
    path: ':collectionType/:slug/history',
    lazy: async () => {
      const { ProtectedHistoryPage } = await import('./pages/History');

      return {
        Component: ProtectedHistoryPage,
      };
    },
  },
];

/**
 * Used to determine if we're on a history route from the admin and the content manager,
 * so that we can hide the left menus on all history routes
 */
function useIsHistoryRoute() {
  const location = useLocation();
  const historyRoutes = routes.map((route) => ({ path: `content-manager/${route.path}` }));
  const matches = matchRoutes(historyRoutes, location);

  return Boolean(matches);
}

export { routes, useIsHistoryRoute };
