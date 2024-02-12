/* eslint-disable check-file/filename-naming-convention */
import { lazy } from 'react';

import { Navigate, RouteObject, useLoaderData, useParams } from 'react-router-dom';

import { COLLECTION_TYPES, SINGLE_TYPES } from './constants/collections';

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

const ProtectedEditViewPage = lazy(() =>
  import('./pages/EditView/EditViewPage').then((mod) => ({ default: mod.ProtectedEditViewPage }))
);
const ProtectedListViewPage = lazy(() =>
  import('./pages/ListView/ListViewPage').then((mod) => ({ default: mod.ProtectedListViewPage }))
);

const CollectionTypePages = () => {
  const { collectionType } = useParams<{ collectionType: string }>();

  /**
   * We only support two types of collections.
   */
  if (collectionType !== COLLECTION_TYPES && collectionType !== SINGLE_TYPES) {
    return <Navigate to="/404" />;
  }

  return collectionType === COLLECTION_TYPES ? (
    <ProtectedListViewPage />
  ) : (
    <ProtectedEditViewPage />
  );
};

const routes: RouteObject[] = [
  {
    path: 'content-manager/*',
    lazy: async () => {
      const { Layout } = await import('./layout');

      return {
        Component: Layout,
      };
    },
    children: [
      /**
       * These redirects exist because we've changed to use
       * the same term in `:collectionType` as the admin API
       * for simplicity
       */
      {
        path: 'collectionType/:model',
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
          return {
            Component: CollectionTypePages,
          };
        },
      },
      {
        path: ':collectionType/:slug/:id',
        lazy: async () => {
          const { ProtectedEditViewPage } = await import('./pages/EditView/EditViewPage');

          return {
            Component: ProtectedEditViewPage,
          };
        },
      },
      {
        path: ':collectionType/:slug/create/clone/:origin',
        lazy: async () => {
          const { ProtectedEditViewPage } = await import('./pages/EditView/EditViewPage');

          return {
            Component: ProtectedEditViewPage,
          };
        },
      },
      {
        path: ':collectionType/:slug/configurations/list',
        lazy: async () => {
          const { ProtectedListConfiguration } = await import(
            './pages/ListConfiguration/ListConfigurationPage'
          );

          return {
            Component: ProtectedListConfiguration,
          };
        },
      },
      // {
      //   path: ':collectionType/:slug/configurations/edit',
      //   lazy: async () => {
      //     const { ProtectedEditSettingsView } = await import(
      //       './pages/EditSettingsView/EditSettingsView'
      //     );

      //     return {
      //       Component: ProtectedEditSettingsView,
      //     };
      //   },
      // },
      // {
      //   path: 'components/:uid/configurations/edit',
      //   lazy: async () => {
      //     const { ProtectedComponentSettingsView } = await import('./pages/ComponentSettingsView');

      //     return {
      //       Component: ProtectedComponentSettingsView,
      //     };
      //   },
      // },
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
    ],
  },
];

export { routes };
