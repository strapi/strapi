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
import produce from 'immer';
import { useQueries } from 'react-query';
import { valid, lt } from 'semver';

import packageJSON from '../../../package.json';
import { useConfigurations } from '../hooks';
import { Admin } from '../pages/Admin';
import getFullName from '../utils/getFullName';
import { hashAdminUserEmail } from '../utils/uniqueAdminHash';

import RBACProvider from './RBACProvider';

const strapiVersion = packageJSON.version;

const initialState = {
  plugins: null,
};

const reducer = (state = initialState, action) =>
  /* eslint-disable-next-line consistent-return */
  produce(state, (draftState) => {
    switch (action.type) {
      case 'SET_PLUGIN_READY': {
        if (!draftState.plugins?.[action.pluginId]) {
          draftState.plugins[action.pluginId] = {};
        }

        draftState.plugins[action.pluginId].isReady = true;
        break;
      }
      default:
        return draftState;
    }
  });

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
  const { plugins: appPlugins } = useStrapiApp();
  const [{ plugins }, dispatch] = React.useReducer(reducer, initialState, () => ({
    plugins: appPlugins,
  }));
  const setPlugin = React.useRef((pluginId) => {
    dispatch({ type: 'SET_PLUGIN_READY', pluginId });
  });
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

  const hasApluginNotReady = Object.keys(plugins).some(
    (plugin) => plugins[plugin].isReady === false
  );

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

  if (isLoadingRelease || isLoadingAppInfos || isLoadingPermissions || hasApluginNotReady) {
    const initializers = Object.keys(plugins).reduce((acc, current) => {
      const InitializerComponent = plugins[current].initializer;

      if (InitializerComponent) {
        const key = plugins[current].pluginId;

        acc.push(<InitializerComponent key={key} setPlugin={setPlugin.current} />);
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
      setUserDisplayName={setUserDisplayName}
      shouldUpdateStrapi={checkLatestStrapiVersion(strapiVersion, tagName)}
      userDisplayName={userDisplayName}
    >
      <RBACProvider permissions={permissions} refetchPermissions={refetch}>
        <Admin />
      </RBACProvider>
    </AppInfoProvider>
  );
};
