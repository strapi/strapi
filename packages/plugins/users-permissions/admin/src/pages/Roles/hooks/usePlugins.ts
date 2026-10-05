import { useEffect } from 'react';

import { useAPIErrorHandler, useNotification, useFetchClient } from '@strapi/strapi/admin';
import { useQuery } from 'react-query';

import { cleanPermissions } from '../../../utils/cleanPermissions';
import { getTrad } from '../../../utils/getTrad';

import type { Permissions, Routes } from '../../../types';

/** Loads configurable API permissions and their bound routes. */
export const usePlugins = () => {
  const { toggleNotification } = useNotification();
  const { get } = useFetchClient();
  const { formatAPIError } = useAPIErrorHandler(getTrad);

  const {
    data: permissions,
    isLoading: isLoadingPermissions,
    error: permissionsError,
    refetch: refetchPermissions,
  } = useQuery<Permissions, Error>(['users-permissions', 'permissions'], async () => {
    const { data } = await get<{ permissions: Permissions }>('/users-permissions/permissions');
    return data.permissions;
  });
  const {
    data: routes,
    isLoading: isLoadingRoutes,
    error: routesError,
    refetch: refetchRoutes,
  } = useQuery<Routes, Error>(['users-permissions', 'routes'], async () => {
    const { data } = await get<{ routes: Routes }>('/users-permissions/routes');
    return data.routes;
  });

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
