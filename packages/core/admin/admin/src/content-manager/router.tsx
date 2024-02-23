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

const CLONE_RELATIVE_PATH = ':collectionType/:slug/clone/:origin';
const CLONE_PATH = `/content-manager/${CLONE_RELATIVE_PATH}`;

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
        path: CLONE_RELATIVE_PATH,
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
      {
        path: 'components/:slug/configurations/edit',
        lazy: async () => {
          const { ProtectedComponentConfigurationPage } = await import(
            './pages/ComponentConfigurationPage'
          );

          return {
            Component: ProtectedComponentConfigurationPage,
          };
        },
      },
      {
        path: ':collectionType/:slug/configurations/edit',
        lazy: async () => {
          const { ProtectedEditConfigurationPage } = await import('./pages/EditConfigurationPage');

          return {
            Component: ProtectedEditConfigurationPage,
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
    ],
  },
];

export { routes, CLONE_PATH };
