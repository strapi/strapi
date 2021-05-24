import React, { useEffect, useState } from 'react';
import { LoadingIndicatorPage, AppInfosContext } from '@strapi/helper-plugin';
import { useQueries } from 'react-query';
import packageJSON from '../../../../package.json';
import PluginsInitializer from '../PluginsInitializer';
import RBACProvider from '../RBACProvider';
import { fetchAppInfo, fetchCurrentUserPermissions, fetchStrapiLatestRelease } from './utils/api';
import checkLatestStrapiVersion from './utils/checkLatestStrapiVersion';

const { STRAPI_ADMIN_UPDATE_NOTIFICATION } = process.env;
const canFetchRelease = STRAPI_ADMIN_UPDATE_NOTIFICATION === 'true';
const strapiVersion = packageJSON.version;

const AuthenticatedApp = () => {
  const [state, setState] = useState({
    shouldUpdateStrapi: false,
    latestStrapiReleaseTag: strapiVersion,
  });

  // TODO: clean components that depends on this
  // This part is just to prepare the refactoring of the Admin page
  const [
    { data: appInfos, status },
    { data: tag_name, status: releaseStatus, isLoading },
    { data: permissions, status: fetchPermissionsStatus, refetch, isFetched, isFetching },
  ] = useQueries([
    { queryKey: 'app-infos', queryFn: fetchAppInfo },
    {
      queryKey: 'strapi-release',
      queryFn: fetchStrapiLatestRelease,
      enabled: canFetchRelease,
      initialData: strapiVersion,
    },
    {
      queryKey: 'admin-users-permission',
      queryFn: fetchCurrentUserPermissions,
      initialData: [],
    },
  ]);

  useEffect(() => {
    if (releaseStatus === 'success') {
      const shouldUpdateStrapi = checkLatestStrapiVersion(strapiVersion, tag_name);

      setState({ shouldUpdateStrapi, latestStrapiReleaseTag: tag_name });
    }
  }, [releaseStatus, tag_name]);

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
    <AppInfosContext.Provider value={{ ...appInfos, ...state }}>
      <RBACProvider permissions={permissions} refetchPermissions={refetch}>
        <PluginsInitializer />
      </RBACProvider>
    </AppInfosContext.Provider>
  );
};

export default AuthenticatedApp;
