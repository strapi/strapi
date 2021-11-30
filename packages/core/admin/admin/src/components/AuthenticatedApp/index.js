import React, { useMemo, useState } from 'react';
//  TODO: DS add loader
import { auth, LoadingIndicatorPage, AppInfosContext } from '@strapi/helper-plugin';
import { useQueries } from 'react-query';
import get from 'lodash/get';
import packageJSON from '../../../../package.json';
import { useConfigurations } from '../../hooks';
import PluginsInitializer from '../PluginsInitializer';
import RBACProvider from '../RBACProvider';
import { fetchAppInfo, fetchCurrentUserPermissions, fetchStrapiLatestRelease } from './utils/api';
import checkLatestStrapiVersion from './utils/checkLatestStrapiVersion';
import { getFullName } from '../../utils';

const strapiVersion = packageJSON.version;

const AuthenticatedApp = () => {
  const userInfo = auth.getUserInfo();
  const userName = get(userInfo, 'username') || getFullName(userInfo.firstname, userInfo.lastname);
  const [userDisplayName, setUserDisplayName] = useState(userName);
  const { showReleaseNotification } = useConfigurations();
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
      value={{
        ...appInfos,
        latestStrapiReleaseTag: tag_name,
        setUserDisplayName,
        shouldUpdateStrapi,
        userDisplayName,
      }}
    >
      <RBACProvider permissions={permissions} refetchPermissions={refetch}>
        <PluginsInitializer />
      </RBACProvider>
    </AppInfosContext.Provider>
  );
};

export default AuthenticatedApp;
