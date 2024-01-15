/* eslint-disable check-file/filename-naming-convention */
import { Navigate, RouteObject, useParams } from 'react-router-dom';

const RedirectToCollectionTypes = ({
  type = 'collection-types',
}: {
  type: 'collection-types' | 'single-types';
}) => {
  const { slug } = useParams();

  return <Navigate to={`/content-manager/${type}/${slug}`} />;
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
        element: <RedirectToCollectionTypes type={`collection-types`} />,
      },
      {
        path: 'singleType/:slug',
        element: <RedirectToCollectionTypes type={`single-types`} />,
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
          // @ts-expect-error – This will be done in CONTENT-1952
          const { ProtectedEditSettingsView } = await import('./pages/EditSettingsView');

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
    ],
  },
];

export { routes };
