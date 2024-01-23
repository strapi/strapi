/* eslint-disable check-file/filename-naming-convention */
import { UID } from '@strapi/types';
import { Navigate, RouteObject, useLoaderData } from 'react-router-dom';

import { routes as historyRoutes } from './history/routes';

const Redirect = () => {
  const pathname = useLoaderData() as string;

  return (
    <Navigate
      to={{
        pathname,
      }}
    />
  );
};

const routes: RouteObject[] = [
  {
    path: 'content-manager/*',
    lazy: async () => {
      const { App } = await import('./pages/App');

      return {
        Component: App,
      };
    },
    children: [
      /**
       * These redirects exist because we've changed to use
       * the same term in `:collectionType` as the admin API
       * for simplicity
       */
      {
        path: 'collectionType/:slug',
        loader: ({ params }) => {
          const slug = params.slug;

          return `/content-manager/collection-types/${slug}`;
        },
        element: <Redirect />,
      },
      {
        path: 'singleType/:slug',
        loader: ({ params }) => {
          const slug = params.slug;

          return `/content-manager/single-types/${slug}`;
        },
        element: <Redirect />,
      },
      {
        path: ':collectionType/:slug',
        lazy: async () => {
          const { CollectionTypePages } = await import('./pages/CollectionTypePages');

          return {
            Component: CollectionTypePages,
          };
        },
      },
      {
        path: ':collectionType/:slug/:id',
        lazy: async () => {
          const { EditViewLayoutManager } = await import('./pages/EditViewLayoutManager');

          return {
            Component: EditViewLayoutManager,
          };
        },
      },
      {
        path: ':collectionType/:slug/create/clone/:origin',
        lazy: async () => {
          const { EditViewLayoutManager } = await import('./pages/EditViewLayoutManager');

          return {
            Component: EditViewLayoutManager,
          };
        },
      },
      {
        path: ':collectionType/:slug/configurations/list',
        lazy: async () => {
          const { ProtectedListSettingsView } = await import(
            './pages/ListSettingsView/ListSettingsView'
          );

          return {
            Component: ProtectedListSettingsView,
          };
        },
      },
      {
        path: ':collectionType/:slug/configurations/edit',
        lazy: async () => {
          const { ProtectedEditSettingsView } = await import(
            './pages/EditSettingsView/EditSettingsView'
          );

          return {
            Component: ProtectedEditSettingsView,
          };
        },
      },
      {
        path: 'components/:uid/configurations/edit',
        lazy: async () => {
          const { ProtectedComponentSettingsView } = await import('./pages/ComponentSettingsView');

          return {
            Component: ProtectedComponentSettingsView,
          };
        },
      },
      {
        path: '403',
        lazy: async () => {
          const { NoPermissions } = await import('./pages/NoPermissionsPage');

          return {
            Component: NoPermissions,
          };
        },
      },
      {
        path: 'no-content-types',
        lazy: async () => {
          const { NoContentType } = await import('./pages/NoContentTypePage');

          return {
            Component: NoContentType,
          };
        },
      },
      ...historyRoutes,
    ],
  },
];

export { routes };
