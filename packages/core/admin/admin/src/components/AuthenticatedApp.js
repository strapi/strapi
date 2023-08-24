import * as React from 'react';

import {
  AppInfoProvider,
  auth,
  LoadingIndicatorPage,
  useFetchClient,
  useGuidedTour,
  useNotification,
  useStrapiApp,
} from '@strapi/helper-plugin';
import { useQueries } from 'react-query';
import { valid, lt } from 'semver';

import packageJSON from '../../../package.json';
import { useConfigurations } from '../hooks';
import { Admin } from '../pages/Admin';
import { getFullName } from '../utils/getFullName';
import { hashAdminUserEmail } from '../utils/uniqueAdminHash';

import NpsSurvey from './NpsSurvey';
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
  const [userDisplayName, setUserDisplayName] = React.useState(
    userInfo?.userName ?? getFullName(userInfo.firstname, userInfo.lastname)
  );
  const [userId, setUserId] = React.useState(null);
  const { showReleaseNotification } = useConfigurations();
  const { plugins: appPlugins = {} } = useStrapiApp();
  const [plugins, setPlugins] = React.useState(appPlugins);
  const [
    { data: appInfos, isLoading: isLoadingAppInfos },
    { data: tagName },
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
      retry: false,
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

  // Display the guided tour conditionally for super admins in development mode
  React.useEffect(() => {
    if (userRoles) {
      const isUserSuperAdmin = userRoles.find(({ code }) => code === 'strapi-super-admin');

      if (isUserSuperAdmin && appInfos?.currentEnvironment === 'development') {
        setGuidedTourVisibility(true);
      }
    }
  }, [userRoles, appInfos, setGuidedTourVisibility]);

  // Create a hash of the users email adress and use it as ID for tracking
  React.useEffect(() => {
    const generateUserId = async (userInfo) => {
      const userId = await hashAdminUserEmail(userInfo);
      setUserId(userId);
    };

    if (userInfo) {
      generateUserId(userInfo);
    }
  }, [userInfo]);

  /**
   *
   * I have spent some time trying to understand what is happening here, and wanted to
   * leave that knowledge for my future me:
   *
   * `initializer` is an undocumented property of the `registerPlugin` API. At the time
   * of writing it seems only to be used by the i18n plugin.
   *
   * How does it work?
   *
   * Every plugin that has an `initializer` component defined, receives the
   * `setPlugin` function as a component prop. In the case of i18n the plugin fetches locales
   * first and calls `setPlugin` with `pluginId` once they are loaded, which then triggers the
   * reducer of the admin app defined above.
   *
   * Once all plugins are set to `isReady: true` the app renders.
   *
   * This API is used to block rendering of the admin app. We should remove that in v5 completely
   * and make sure plugins can inject data into the global store before they are initialized, to avoid
   * having a new prop-callback based communication channel between plugins and the core admin app.
   *
   */

  const hasApluginNotReady = Object.values(plugins).some((plugin) => plugin.isReady === false);

  if (
    !userDisplayName ||
    !userId ||
    isLoadingAppInfos ||
    isLoadingPermissions ||
    hasApluginNotReady
  ) {
    const initializers = Object.keys(plugins).reduce((acc, current) => {
      const InitializerComponent = plugins[current].initializer;

      if (InitializerComponent) {
        const key = plugins[current].pluginId;

        acc.push(
          <InitializerComponent
            key={key}
            setPlugin={(pluginId) => {
              setPlugins((prev) => ({
                ...prev,
                [pluginId]: {
                  ...prev[pluginId],
                  isReady: true,
                },
              }));
            }}
          />
        );
      }

      return acc;
    }, []);

    return (
      <>
        {initializers}
        <LoadingIndicatorPage />
      </>
    );
  }

  return (
    <AppInfoProvider
      {...appInfos}
      userId={userId}
      latestStrapiReleaseTag={tagName}
      // TODO: setUserDisplayName should not exist and be removed, as it is only used
      // to update the displayName immediately, in case a user updates their profile.
      // This information should be derived from the state.
      setUserDisplayName={setUserDisplayName}
      shouldUpdateStrapi={checkLatestStrapiVersion(strapiVersion, tagName)}
      userDisplayName={userDisplayName}
    >
      <RBACProvider permissions={permissions} refetchPermissions={refetch}>
        <NpsSurvey />
        <Admin />
      </RBACProvider>
    </AppInfoProvider>
  );
};
