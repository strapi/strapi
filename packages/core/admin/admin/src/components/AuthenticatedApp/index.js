import React from 'react';
import { LoadingIndicatorPage, AppInfosContext } from '@strapi/helper-plugin';
import { useQueries } from 'react-query';
import PluginsInitializer from '../PluginsInitializer';
import RBACProvider from '../RBACProvider';
import { fetchAppInfo, fetchCurrentUserPermissions } from './utils/api';

const AuthenticatedApp = () => {
  // TODO: clean components that depends on this
  // This part is just to prepare the refactoring of the Admin page
  const [
    { data: appInfos, status },
    { data: permissions, status: fetchPermissionsStatus, refetch, isFetched, isFetching },
  ] = useQueries([
    { queryKey: 'app-infos', queryFn: fetchAppInfo },

    {
      queryKey: 'admin-users-permission',
      queryFn: fetchCurrentUserPermissions,
    },
  ]);

  const shouldShowNotDependentQueriesLoader =
    (isFetching && isFetched) || status === 'loading' || fetchPermissionsStatus === 'loading';

  if (shouldShowNotDependentQueriesLoader) {
    return <LoadingIndicatorPage />;
  }

  // TODO add error state
  if (status === 'error') {
    return <div>error...</div>;
  }

  return (
    <AppInfosContext.Provider value={appInfos}>
      <RBACProvider permissions={permissions} refetchPermissions={refetch}>
        <PluginsInitializer />
      </RBACProvider>
    </AppInfosContext.Provider>
  );
};

export default AuthenticatedApp;
