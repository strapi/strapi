import * as React from 'react';

import { AppInfoProvider, LoadingIndicatorPage, useGuidedTour } from '@strapi/helper-plugin';
import lt from 'semver/functions/lt';
import valid from 'semver/functions/valid';
//  TODO: DS add loader

import packageJSON from '../../../package.json';
import { useAuth } from '../features/Auth';
import { useConfiguration } from '../features/Configuration';
import { useInformationQuery } from '../services/admin';
import { useGetMyPermissionsQuery } from '../services/auth';
import { getFullName } from '../utils/getFullName';
import { hashAdminUserEmail } from '../utils/hashAdminUserEmail';

import { NpsSurvey } from './NpsSurvey';
import { PluginsInitializer } from './PluginsInitializer';
import { RBACProvider } from './RBACProvider';

const strapiVersion = packageJSON.version;

const AuthenticatedApp = () => {
  const { setGuidedTourVisibility } = useGuidedTour();
  const userInfo = useAuth('AuthenticatedApp', (state) => state.user);
  const [userDisplayName, setUserDisplayName] = React.useState<string>(() =>
    userInfo ? userInfo.username || getFullName(userInfo.firstname ?? '', userInfo.lastname) : ''
  );
  /**
   * Keep this in sync with the user info we return from the useAuth hook.
   * We can't remove the above state because it's used in `useAppInfo` which
   * is a public API.
   *
   * TODO: remove this workaround in V5.
   */
  React.useEffect(() => {
    setUserDisplayName(
      userInfo ? userInfo.username || getFullName(userInfo.firstname ?? '', userInfo.lastname) : ''
    );
  }, [userInfo]);
  const [userId, setUserId] = React.useState<string>();
  const { showReleaseNotification } = useConfiguration('AuthenticatedApp');

  const { data: appInfo, isLoading: isLoadingAppInfo } = useInformationQuery();
  /**
   * TODO: in V5 remove the `RBACProvider` and fire this in the Auth provider instead.
   */
  const {
    data: permissions,
    isLoading: isLoadingPermissions,
    refetch,
  } = useGetMyPermissionsQuery();

  const [tagName, setTagName] = React.useState<string>(strapiVersion);

  React.useEffect(() => {
    if (showReleaseNotification) {
      fetch('https://api.github.com/repos/strapi/strapi/releases/latest')
        .then(async (res) => {
          if (!res.ok) {
            throw new Error();
          }

          const response = (await res.json()) as { tag_name: string | null | undefined };

          if (!response.tag_name) {
            throw new Error();
          }

          setTagName(response.tag_name);
        })
        .catch(() => {
          /**
           * silence is golden & we'll use the strapiVersion as a fallback
           */
        });
    }
  }, [showReleaseNotification]);

  const userRoles = useAuth('AuthenticatedApp', (state) => state.user?.roles);

  React.useEffect(() => {
    if (userRoles) {
      const isUserSuperAdmin = userRoles.find(({ code }) => code === 'strapi-super-admin');

      if (isUserSuperAdmin && appInfo?.autoReload) {
        setGuidedTourVisibility(true);
      }
    }
  }, [userRoles, appInfo?.autoReload, setGuidedTourVisibility]);

  React.useEffect(() => {
    hashAdminUserEmail(userInfo).then((id) => {
      if (id) {
        setUserId(id);
      }
    });
  }, [userInfo]);

  // We don't need to wait for the release query to be fetched before rendering the plugins
  // however, we need the appInfos and the permissions
  if (isLoadingAppInfo || isLoadingPermissions) {
    return <LoadingIndicatorPage />;
  }

  const refetchPermissions = () => {
    refetch();
  };

  return (
    <AppInfoProvider
      {...appInfo}
      userId={userId}
      latestStrapiReleaseTag={tagName}
      setUserDisplayName={setUserDisplayName}
      shouldUpdateStrapi={checkLatestStrapiVersion(strapiVersion, tagName)}
      userDisplayName={userDisplayName}
    >
      <RBACProvider permissions={permissions ?? []} refetchPermissions={refetchPermissions}>
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
