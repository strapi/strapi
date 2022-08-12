import React, { useMemo, useState, useEffect, useRef } from 'react';
//  TODO: DS add loader
import {
  auth,
  LoadingIndicatorPage,
  AppInfosContext,
  useGuidedTour,
  useNotification,
} from '@strapi/helper-plugin';
import { useQueries } from 'react-query';
import get from 'lodash/get';
import packageJSON from '../../../../package.json';
import { useConfigurations } from '../../hooks';
import PluginsInitializer from '../PluginsInitializer';
import RBACProvider from '../RBACProvider';
import {
  fetchAppInfo,
  fetchCurrentUserPermissions,
  fetchStrapiLatestRelease,
  fetchUserRoles,
} from './utils/api';
import checkLatestStrapiVersion from './utils/checkLatestStrapiVersion';
import { getFullName } from '../../utils';

const strapiVersion = packageJSON.version;

const AuthenticatedApp = () => {
  const { setGuidedTourVisibility } = useGuidedTour();
  const toggleNotification = useNotification();
  const setGuidedTourVisibilityRef = useRef(setGuidedTourVisibility);
  const userInfo = auth.getUserInfo();
  const userName = get(userInfo, 'username') || getFullName(userInfo.firstname, userInfo.lastname);
  const [userDisplayName, setUserDisplayName] = useState(userName);
  const { showReleaseNotification } = useConfigurations();
  const [
    { data: appInfos, status },
    { data: tag_name, isLoading },
    { data: permissions, status: fetchPermissionsStatus, refetch, isFetched, isFetching },
    { data: userRoles },
  ] = useQueries([
    { queryKey: 'app-infos', queryFn: fetchAppInfo },
    {
      queryKey: 'strapi-release',
      queryFn: () => fetchStrapiLatestRelease(toggleNotification),
      enabled: showReleaseNotification,
      initialData: strapiVersion,
    },
    {
      queryKey: 'admin-users-permission',
      queryFn: fetchCurrentUserPermissions,
      initialData: [],
    },
    {
      queryKey: 'user-roles',
      queryFn: fetchUserRoles,
    },
  ]);

  const shouldUpdateStrapi = useMemo(
    () => checkLatestStrapiVersion(strapiVersion, tag_name),
    [tag_name]
  );

  useEffect(() => {
    if (userRoles) {
      const isUserSuperAdmin = userRoles.find(({ code }) => code === 'strapi-super-admin');

      if (isUserSuperAdmin) {
        setGuidedTourVisibilityRef.current(true);
      }
    }
  }, [userRoles]);

  // We don't need to wait for the release query to be fetched before rendering the plugins
  // however, we need the appInfos and the permissions
  const shouldShowNotDependentQueriesLoader =
    (isFetching && isFetched) || status === 'loading' || fetchPermissionsStatus === 'loading';

  const shouldShowLoader = isLoading || shouldShowNotDependentQueriesLoader;

  const appInfosValue = useMemo(() => {
    return {
      ...appInfos,
      latestStrapiReleaseTag: tag_name,
      setUserDisplayName,
      shouldUpdateStrapi,
      userDisplayName,
    };
  }, [appInfos, tag_name, shouldUpdateStrapi, userDisplayName]);

  if (shouldShowLoader) {
    return <LoadingIndicatorPage />;
  }

  // TODO add error state
  if (status === 'error') {
    return <div>error...</div>;
  }

  return (
    <AppInfosContext.Provider value={appInfosValue}>
      <RBACProvider permissions={permissions} refetchPermissions={refetch}>
        <PluginsInitializer />
      </RBACProvider>
    </AppInfosContext.Provider>
  );
};

export default AuthenticatedApp;
