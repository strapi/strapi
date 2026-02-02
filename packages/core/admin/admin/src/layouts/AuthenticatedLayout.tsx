import * as React from 'react';

import packageInfo from '@strapi/admin/package.json';
import { Box, Flex, SkipToContent } from '@strapi/design-system';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useIntl } from 'react-intl';
import { Outlet } from 'react-router-dom';
import lt from 'semver/functions/lt';
import valid from 'semver/functions/valid';

import { LeftMenu } from '../components/LeftMenu';
import { NpsSurvey } from '../components/NpsSurvey';
import { Page } from '../components/PageHelpers';
import { PluginsInitializer } from '../components/PluginsInitializer';
import { PrivateRoute } from '../components/PrivateRoute';
import { UpsellBanner } from '../components/UpsellBanner';
import { AppInfoProvider } from '../features/AppInfo';
import { useAuth } from '../features/Auth';
import { useConfiguration } from '../features/Configuration';
import { useStrapiApp } from '../features/StrapiApp';
import { useTracking } from '../features/Tracking';
import { useMenu } from '../hooks/useMenu';
import { useInformationQuery } from '../services/admin';
import { hashAdminUserEmail } from '../utils/users';

const { version: strapiVersion } = packageInfo;

const AdminLayout = () => {
  const { formatMessage } = useIntl();
  const userInfo = useAuth('AuthenticatedApp', (state) => state.user);
  const [userId, setUserId] = React.useState<string>();
  const { showReleaseNotification } = useConfiguration('AuthenticatedApp');

  const { data: appInfo, isLoading: isLoadingAppInfo } = useInformationQuery();
  const [tagName, setTagName] = React.useState<string>(strapiVersion);

  React.useEffect(() => {
    if (showReleaseNotification) {
      fetch('https://api.github.com/repos/strapi/strapi/releases/latest')
        .then(async (res) => {
          if (!res.ok) {
            return;
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

  React.useEffect(() => {
    hashAdminUserEmail(userInfo).then((id) => {
      if (id) {
        setUserId(id);
      }
    });
  }, [userInfo]);

  const { trackUsage } = useTracking();

  const {
    isLoading: isLoadingMenu,
    generalSectionLinks,
    pluginsSectionLinks,
    topMobileNavigation,
    burgerMobileNavigation,
  } = useMenu(checkLatestStrapiVersion(strapiVersion, tagName));

  const getAllWidgets = useStrapiApp('TrackingProvider', (state) => state.widgets.getAll);
  const projectId = appInfo?.projectId;
  React.useEffect(() => {
    if (projectId) {
      trackUsage('didAccessAuthenticatedAdministration', {
        registeredWidgets: getAllWidgets().map((widget) => widget.uid),
        projectId,
      });
    }
  }, [projectId, getAllWidgets, trackUsage]);

  // We don't need to wait for the release query to be fetched before rendering the plugins
  // however, we need the appInfos and the permissions
  if (isLoadingMenu || isLoadingAppInfo) {
    return <Page.Loading />;
  }

  return (
    <AppInfoProvider
      {...appInfo}
      userId={userId}
      latestStrapiReleaseTag={tagName}
      shouldUpdateStrapi={checkLatestStrapiVersion(strapiVersion, tagName)}
    >
      <NpsSurvey />
      <PluginsInitializer>
        <DndProvider backend={HTML5Backend}>
          <Box background="neutral100">
            <SkipToContent>
              {formatMessage({ id: 'skipToContent', defaultMessage: 'Skip to content' })}
            </SkipToContent>
            <Flex
              height="100dvh"
              direction={{
                initial: 'column',
                large: 'row',
              }}
              alignItems="flex-start"
            >
              <LeftMenu
                generalSectionLinks={generalSectionLinks}
                pluginsSectionLinks={pluginsSectionLinks}
                topMobileNavigation={topMobileNavigation}
                burgerMobileNavigation={burgerMobileNavigation}
              />
              <Box
                flex={1}
                overflow="auto"
                width="100%"
                height={{
                  initial: 'auto',
                  large: '100%',
                }}
              >
                <UpsellBanner />
                <Outlet />
              </Box>
            </Flex>
          </Box>
        </DndProvider>
      </PluginsInitializer>
    </AppInfoProvider>
  );
};

const PrivateAdminLayout = () => {
  return (
    <PrivateRoute>
      <AdminLayout />
    </PrivateRoute>
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

export { AdminLayout, PrivateAdminLayout };
