import * as React from 'react';

import {
  AppInfoContextValue,
  AppInfoProvider,
  auth,
  LoadingIndicatorPage,
  useFetchClient,
  useGuidedTour,
} from '@strapi/helper-plugin';
import { useQueries } from 'react-query';
import lt from 'semver/functions/lt';
import valid from 'semver/functions/valid';
//  TODO: DS add loader

import packageJSON from '../../../package.json';
import { UserEntity } from '../../../shared/entities';
import { useConfiguration } from '../hooks/useConfiguration';
import { APIResponse, APIResponseUsersLegacy } from '../types/adminAPI';
import { getFullName } from '../utils/getFullName';
import { hashAdminUserEmail } from '../utils/hashAdminUserEmail';

import { NpsSurvey } from './NpsSurvey';
import { PluginsInitializer } from './PluginsInitializer';
import { RBACProvider, Permission } from './RBACProvider';

const strapiVersion = packageJSON.version;

const AuthenticatedApp = () => {
  const { setGuidedTourVisibility } = useGuidedTour();
  const userInfo = auth.get('userInfo');
  const [userDisplayName, setUserDisplayName] = React.useState<string>(() =>
    userInfo ? userInfo.username || getFullName(userInfo.firstname ?? '', userInfo.lastname) : ''
  );
  const [userId, setUserId] = React.useState<string>();
  const { showReleaseNotification } = useConfiguration();
  const { get } = useFetchClient();
  const [
    { data: appInfos, status },
    { data: tagName, isLoading },
    { data: permissions, status: fetchPermissionsStatus, refetch, isFetching },
    { data: userRoles },
  ] = useQueries([
    {
      queryKey: 'app-infos',
      async queryFn() {
        const { data } = await get<
          APIResponse<
            Pick<
              AppInfoContextValue,
              | 'currentEnvironment'
              | 'autoReload'
              | 'communityEdition'
              | 'dependencies'
              | 'useYarn'
              | 'projectId'
              | 'strapiVersion'
              | 'nodeVersion'
            >
          >
        >('/admin/information');

        return data.data;
      },
    },
    {
      queryKey: 'strapi-release',
      async queryFn() {
        try {
          const res = await fetch('https://api.github.com/repos/strapi/strapi/releases/latest');

          if (!res.ok) {
            throw new Error();
          }

          const response = (await res.json()) as { tag_name: string | null | undefined };

          if (!response.tag_name) {
            throw new Error();
          }

          return response.tag_name;
        } catch (err) {
          // Don't throw an error
          return strapiVersion;
        }
      },
      enabled: showReleaseNotification,
      initialData: strapiVersion,
    },
    {
      queryKey: 'admin-users-permission',
      async queryFn() {
        const { data } = await get<{ data: Permission[] }>('/admin/users/me/permissions');

        return data.data;
      },
      initialData: [],
    },
    {
      queryKey: 'user-roles',
      async queryFn() {
        const {
          data: {
            data: { roles },
          },
        } = await get<APIResponseUsersLegacy<UserEntity>>('/admin/users/me');

        return roles;
      },
    },
  ]);

  const shouldUpdateStrapi = checkLatestStrapiVersion(strapiVersion, tagName);

  /**
   * TODO: does this actually need to be an effect?
   */
  React.useEffect(() => {
    if (userRoles) {
      const isUserSuperAdmin = userRoles.find(({ code }) => code === 'strapi-super-admin');

      if (isUserSuperAdmin && appInfos?.autoReload) {
        setGuidedTourVisibility(true);
      }
    }
  }, [userRoles, appInfos, setGuidedTourVisibility]);

  React.useEffect(() => {
    const getUserId = async () => {
      if (userInfo) {
        const userId = await hashAdminUserEmail(userInfo);

        if (userId) {
          setUserId(userId);
        }
      }
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
      <RBACProvider permissions={permissions ?? []} refetchPermissions={refetch}>
        <NpsSurvey />
        <PluginsInitializer />
      </RBACProvider>
    </AppInfoProvider>
  );
};

const checkLatestStrapiVersion = (
  currentPackageVersion: string,
  latestPublishedVersion: string = ''
): boolean => {
  if (!valid(currentPackageVersion) || !valid(latestPublishedVersion)) {
    return false;
  }

  return lt(currentPackageVersion, latestPublishedVersion);
};

export { AuthenticatedApp };
