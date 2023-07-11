import React, { useEffect, useState } from 'react';

import {
  AppInfoProvider,
  auth,
  LoadingIndicatorPage,
  useGuidedTour,
  useNotification,
} from '@strapi/helper-plugin';
import get from 'lodash/get';
import { useQueries } from 'react-query';
//  TODO: DS add loader

import packageJSON from '../../../../package.json';
import { useConfigurations } from '../../hooks';
import { getFullName, hashAdminUserEmail } from '../../utils';
import PluginsInitializer from '../PluginsInitializer';
import RBACProvider from '../RBACProvider';

import {
  fetchAppInfo,
  fetchCurrentUserPermissions,
  fetchStrapiLatestRelease,
  fetchUserRoles,
} from './utils/api';
import checkLatestStrapiVersion from './utils/checkLatestStrapiVersion';

const strapiVersion = packageJSON.version;

const AuthenticatedApp = () => {
  const { setGuidedTourVisibility } = useGuidedTour();
  const toggleNotification = useNotification();
  const userInfo = auth.getUserInfo();
  const userName = get(userInfo, 'username') || getFullName(userInfo.firstname, userInfo.lastname);
  const [userDisplayName, setUserDisplayName] = useState(userName);
  const [userId, setUserId] = useState(null);
  const { showReleaseNotification } = useConfigurations();
  const [
    { data: appInfos, status },
    { data: tagName, isLoading },
    { data: permissions, status: fetchPermissionsStatus, refetch, isFetching },
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

  const shouldUpdateStrapi = checkLatestStrapiVersion(strapiVersion, tagName);

  /**
   * TODO: does this actually need to be an effect?
   */
  useEffect(() => {
    if (userRoles) {
      const isUserSuperAdmin = userRoles.find(({ code }) => code === 'strapi-super-admin');

      if (isUserSuperAdmin && appInfos?.autoReload) {
        setGuidedTourVisibility(true);
      }
    }
  }, [userRoles, appInfos, setGuidedTourVisibility]);

  useEffect(() => {
    const getUserId = async () => {
      const userId = await hashAdminUserEmail(userInfo);
      setUserId(userId);
    };

    getUserId();
  }, [userInfo]);

  // We don't need to wait for the release query to be fetched before rendering the plugins
  // however, we need the appInfos and the permissions
  const shouldShowNotDependentQueriesLoader =
    isFetching || status === 'loading' || fetchPermissionsStatus === 'loading';

  const shouldShowLoader = isLoading || shouldShowNotDependentQueriesLoader;

  if (shouldShowLoader) {
    return <LoadingIndicatorPage />;
  }

  // TODO: add error state
  if (status === 'error') {
    return <div>error...</div>;
  }

  return (
    <AppInfoProvider
      {...appInfos}
      userId={userId}
      latestStrapiReleaseTag={tagName}
      setUserDisplayName={setUserDisplayName}
      shouldUpdateStrapi={shouldUpdateStrapi}
      userDisplayName={userDisplayName}
    >
      <RBACProvider permissions={permissions} refetchPermissions={refetch}>
        <PluginsInitializer />
      </RBACProvider>
    </AppInfoProvider>
  );
};

export default AuthenticatedApp;
