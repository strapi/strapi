/* eslint-disable check-file/filename-naming-convention */
import { lazy } from 'react';

import { Navigate, PathRouteProps, useParams } from 'react-router-dom';

import { COLLECTION_TYPES, SINGLE_TYPES } from './constants/collections';
import { routes as historyRoutes } from './history/routes';

const ProtectedEditViewPage = lazy(() =>
  import('./pages/EditView/EditViewPage').then((mod) => ({ default: mod.ProtectedEditViewPage }))
);
const ProtectedListViewPage = lazy(() =>
  import('./pages/ListView/ListViewPage').then((mod) => ({ default: mod.ProtectedListViewPage }))
);
const ProtectedListConfiguration = lazy(() =>
  import('./pages/ListConfiguration/ListConfigurationPage').then((mod) => ({
    default: mod.ProtectedListConfiguration,
  }))
);
const ProtectedEditConfigurationPage = lazy(() =>
  import('./pages/EditConfigurationPage').then((mod) => ({
    default: mod.ProtectedEditConfigurationPage,
  }))
);
const ProtectedComponentConfigurationPage = lazy(() =>
  import('./pages/ComponentConfigurationPage').then((mod) => ({
    default: mod.ProtectedComponentConfigurationPage,
  }))
);
const NoPermissions = lazy(() =>
  import('./pages/NoPermissionsPage').then((mod) => ({ default: mod.NoPermissions }))
);
const NoContentType = lazy(() =>
  import('./pages/NoContentTypePage').then((mod) => ({ default: mod.NoContentType }))
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
const LIST_RELATIVE_PATH = ':collectionType/:slug';
const LIST_PATH = `/content-manager/${LIST_RELATIVE_PATH}`;

const routes: PathRouteProps[] = [
  {
    path: LIST_RELATIVE_PATH,
    element: <CollectionTypePages />,
  },
  {
    path: ':collectionType/:slug/:id',
    Component: ProtectedEditViewPage,
  },
  {
    path: CLONE_RELATIVE_PATH,
    Component: ProtectedEditViewPage,
  },
  {
    path: ':collectionType/:slug/configurations/list',
    Component: ProtectedListConfiguration,
  },
  {
    path: 'components/:slug/configurations/edit',
    Component: ProtectedComponentConfigurationPage,
  },
  {
    path: ':collectionType/:slug/configurations/edit',
    Component: ProtectedEditConfigurationPage,
  },
  {
    path: '403',
    Component: NoPermissions,
  },
  {
    path: 'no-content-types',
    Component: NoContentType,
  },
  ...historyRoutes,
];

export { routes, CLONE_PATH, LIST_PATH };
