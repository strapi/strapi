import { useEffect } from 'react';

import { useAPIErrorHandler, useNotification, useFetchClient } from '@strapi/strapi/admin';
import { useQueries } from 'react-query';

import { cleanPermissions, getTrad } from '../../../utils';

export const usePlugins = () => {
  const { toggleNotification } = useNotification();
  const { get } = useFetchClient();
  const { formatAPIError } = useAPIErrorHandler(getTrad);

  const [
    {
      data: permissions,
      isLoading: isLoadingPermissions,
      error: permissionsError,
      refetch: refetchPermissions,
    },
    { data: routes, isLoading: isLoadingRoutes, error: routesError, refetch: refetchRoutes },
  ] = useQueries([
    {
      queryKey: ['users-permissions', 'permissions'],
      async queryFn() {
        const {
          data: { permissions },
        } = await get(`/users-permissions/permissions`);

        return permissions;
      },
    },
    {
      queryKey: ['users-permissions', 'routes'],
      async queryFn() {
        const {
          data: { routes },
        } = await get(`/users-permissions/routes`);

        return routes;
      },
    },
  ]);

  const refetchQueries = async () => {
    await Promise.all([refetchPermissions(), refetchRoutes()]);
  };

  useEffect(() => {
    if (permissionsError) {
      toggleNotification({
        type: 'danger',
        message: formatAPIError(permissionsError),
      });
    }
  }, [toggleNotification, permissionsError, formatAPIError]);

  useEffect(() => {
    if (routesError) {
      toggleNotification({
        type: 'danger',
        message: formatAPIError(routesError),
      });
    }
  }, [toggleNotification, routesError, formatAPIError]);

  const isLoading = isLoadingPermissions || isLoadingRoutes;

  return {
    // TODO: these return values need to be memoized, otherwise
    // they will create infinite rendering loops when used as
    // effect dependencies
    permissions: permissions ? cleanPermissions(permissions) : {},
    routes: routes ?? {},

    getData: refetchQueries,
    isLoading,
  };
};
