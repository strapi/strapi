import React, { useContext, useMemo } from 'react';
import { LoadingIndicatorPage, AppInfosContext } from '@strapi/helper-plugin';
import { useQueries } from 'react-query';
import packageJSON from '../../../../package.json';
import { ConfigurationsContext } from '../../contexts';
import PluginsInitializer from '../PluginsInitializer';
import RBACProvider from '../RBACProvider';
import { fetchAppInfo, fetchCurrentUserPermissions, fetchStrapiLatestRelease } from './utils/api';
import checkLatestStrapiVersion from './utils/checkLatestStrapiVersion';

const strapiVersion = packageJSON.version;

const AuthenticatedApp = () => {
  const { showReleaseNotification } = useContext(ConfigurationsContext);
  const [
    { data: appInfos, status },
    { data: tag_name, isLoading },
    { data: permissions, status: fetchPermissionsStatus, refetch, isFetched, isFetching },
  ] = useQueries([
    { queryKey: 'app-infos', queryFn: fetchAppInfo },
    {
      queryKey: 'strapi-release',
      queryFn: fetchStrapiLatestRelease,
      enabled: showReleaseNotification,
      initialData: strapiVersion,
    },
    {
      queryKey: 'admin-users-permission',
      queryFn: fetchCurrentUserPermissions,
      initialData: [],
    },
  ]);

  const shouldUpdateStrapi = useMemo(() => checkLatestStrapiVersion(strapiVersion, tag_name), [
    tag_name,
  ]);

  // We don't need to wait for the release query to be fetched before rendering the plugins
  // however, we need the appInfos and the permissions
  const shouldShowNotDependentQueriesLoader =
    (isFetching && isFetched) || status === 'loading' || fetchPermissionsStatus === 'loading';

  const shouldShowLoader = isLoading || shouldShowNotDependentQueriesLoader;

  if (shouldShowLoader) {
    return <LoadingIndicatorPage />;
  }

  // TODO add error state
  if (status === 'error') {
    return <div>error...</div>;
  }

  return (
    <AppInfosContext.Provider
      value={{ ...appInfos, latestStrapiReleaseTag: tag_name, shouldUpdateStrapi }}
    >
      <RBACProvider permissions={permissions} refetchPermissions={refetch}>
        <PluginsInitializer />
      </RBACProvider>
    </AppInfosContext.Provider>
  );
};

export default AuthenticatedApp;
