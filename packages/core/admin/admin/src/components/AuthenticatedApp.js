import * as React from 'react';

import {
  AppInfoProvider,
  auth,
  LoadingIndicatorPage,
  useFetchClient,
  useGuidedTour,
  useNotification,
} from '@strapi/helper-plugin';
import { useQueries } from 'react-query';
import { valid, lt } from 'semver';

import packageJSON from '../../../package.json';
import { useConfigurations } from '../hooks';
import getFullName from '../utils/getFullName';
import { hashAdminUserEmail } from '../utils/uniqueAdminHash';

import PluginsInitializer from './PluginsInitializer';
import RBACProvider from './RBACProvider';

const strapiVersion = packageJSON.version;

const checkLatestStrapiVersion = (currentPackageVersion, latestPublishedVersion) => {
  if (!valid(currentPackageVersion) || !valid(latestPublishedVersion)) {
    return false;
  }

  return lt(currentPackageVersion, latestPublishedVersion);
};

export const AuthenticatedApp = () => {
  const { setGuidedTourVisibility } = useGuidedTour();
  const toggleNotification = useNotification();
  const userInfo = auth.getUserInfo();
  const { get } = useFetchClient();
  // TODO: replace with getDisplayName()
  const userName = userInfo?.userName ?? getFullName(userInfo.firstname, userInfo.lastname);
  const [userDisplayName, setUserDisplayName] = React.useState(userName);
  const [userId, setUserId] = React.useState(null);
  const { showReleaseNotification } = useConfigurations();
  const [
    { data: appInfos, isLoading: isLoadingAppInfos },
    { data: tagName, isLoading: isLoadingRelease },
    { data: permissions, isLoading: isLoadingPermissions, refetch },
    { data: userRoles },
  ] = useQueries([
    {
      queryKey: 'information',
      async queryFn() {
        const {
          data: { data },
        } = await get('/admin/information');

        return data;
      },
    },

    {
      queryKey: 'strapi-release',
      async queryFn() {
        const res = await fetch('https://api.github.com/repos/strapi/strapi/releases/latest');

        if (!res.ok) {
          throw new Error('Failed to fetch latest Strapi version.');
        }

        const { tag_name } = await res.json();

        return tag_name;
      },
      enabled: showReleaseNotification,
      initialData: strapiVersion,
      onSuccess(data) {
        const shouldUpdateStrapi = checkLatestStrapiVersion(strapiVersion, data.tag_name);

        if (shouldUpdateStrapi && !JSON.parse(localStorage.getItem('STRAPI_UPDATE_NOTIF'))) {
          toggleNotification({
            type: 'info',
            message: { id: 'notification.version.update.message' },
            link: {
              url: `https://github.com/strapi/strapi/releases/tag/${data.tag_name}`,
              label: {
                id: 'global.see-more',
              },
            },
            blockTransition: true,
            onClose: () => localStorage.setItem('STRAPI_UPDATE_NOTIF', true),
          });
        }
      },
    },
    {
      queryKey: ['users', 'me', 'permissions'],
      async queryFn() {
        const {
          data: { data },
        } = await get('/admin/users/me/permissions');

        return data;
      },
      initialData: [],
    },

    {
      queryKey: ['users', 'me'],
      async queryFn() {
        const {
          data: {
            data: { roles },
          },
        } = await get('/admin/users/me');

        return roles;
      },
    },
  ]);

  React.useEffect(() => {
    if (userRoles) {
      const isUserSuperAdmin = userRoles.find(({ code }) => code === 'strapi-super-admin');

      if (isUserSuperAdmin && appInfos?.currentEnvironment === 'development') {
        setGuidedTourVisibility(true);
      }
    }
  }, [userRoles, appInfos, setGuidedTourVisibility]);

  React.useEffect(() => {
    const generateUserId = async () => {
      const userId = await hashAdminUserEmail(userInfo);
      setUserId(userId);
    };

    generateUserId();
  }, [userInfo]);

  if (isLoadingRelease || isLoadingAppInfos || isLoadingPermissions) {
    return <LoadingIndicatorPage />;
  }

  return (
    <AppInfoProvider
      {...appInfos}
      userId={userId}
      latestStrapiReleaseTag={tagName}
      setUserDisplayName={setUserDisplayName}
      shouldUpdateStrapi={checkLatestStrapiVersion(strapiVersion, tagName)}
      userDisplayName={userDisplayName}
    >
      <RBACProvider permissions={permissions} refetchPermissions={refetch}>
        <PluginsInitializer />
      </RBACProvider>
    </AppInfoProvider>
  );
};
