import React, { useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { Helmet } from 'react-helmet';
import { useQuery } from 'react-query';
import matchSorter from 'match-sorter';
import {
  AnErrorOccurred,
  CheckPagePermissions,
  useFocusWhenNavigate,
  useTracking,
  LoadingIndicatorPage,
  useNotification,
  useAppInfos,
} from '@strapi/helper-plugin';
import { Layout, ContentLayout } from '@strapi/design-system/Layout';
import { Main } from '@strapi/design-system/Main';
import { Searchbar } from '@strapi/design-system/Searchbar';
import { Box } from '@strapi/design-system/Box';
import { useNotifyAT } from '@strapi/design-system/LiveRegions';
import { Typography } from '@strapi/design-system/Typography';
import { Flex } from '@strapi/design-system/Flex';
import { Tabs, Tab, TabGroup, TabPanels, TabPanel } from '@strapi/design-system/Tabs';

import EmptyNpmPackageSearch from './components/EmptyNpmPackageSearch';
import PageHeader from './components/PageHeader';
import { fetchAppInformation } from './utils/api';
import useFetchInstalledPlugins from '../../hooks/useFetchInstalledPlugins';
import useFetchMarketplaceProviders from '../../hooks/useFetchMarketplaceProviders';
import useFetchMarketplacePlugins from '../../hooks/useFetchMarketplacePlugins';
import adminPermissions from '../../permissions';
import offlineCloud from '../../assets/images/icon_offline-cloud.svg';
import useNavigatorOnLine from '../../hooks/useNavigatorOnLine';
import MissingPluginBanner from './components/MissingPluginBanner';
import NpmPackagesGrid from './components/NpmPackagesGrid';

const matchSearch = (npmPackages, search) => {
  return matchSorter(npmPackages, search, {
    keys: [
      {
        threshold: matchSorter.rankings.WORD_STARTS_WITH,
        key: 'attributes.name',
      },
      { threshold: matchSorter.rankings.WORD_STARTS_WITH, key: 'attributes.description' },
    ],
  });
};

const MarketPlacePage = () => {
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const { notifyStatus } = useNotifyAT();
  const trackUsageRef = useRef(trackUsage);
  const toggleNotification = useNotification();
  const [searchQuery, setSearchQuery] = useState('');
  const { autoReload: isInDevelopmentMode } = useAppInfos();
  const isOnline = useNavigatorOnLine();

  useFocusWhenNavigate();

  const marketplaceTitle = formatMessage({
    id: 'global.marketplace',
    defaultMessage: 'Marketplace',
  });

  const notifyMarketplaceLoad = () => {
    notifyStatus(
      formatMessage(
        {
          id: 'app.utils.notify.data-loaded',
          defaultMessage: 'The {target} has loaded',
        },
        { target: marketplaceTitle }
      )
    );
  };

  const {
    status: marketplacePluginsStatus,
    data: marketplacePluginsResponse,
  } = useFetchMarketplacePlugins(notifyMarketplaceLoad);

  const {
    status: marketplaceProvidersStatus,
    data: marketplaceProvidersResponse,
  } = useFetchMarketplaceProviders(notifyMarketplaceLoad);

  const {
    status: installedPluginsStatus,
    data: installedPluginsResponse,
  } = useFetchInstalledPlugins();

  const { data: appInfoResponse, status: appInfoStatus } = useQuery(
    'app-information',
    fetchAppInformation,
    {
      onError: () => {
        toggleNotification({
          type: 'warning',
          message: { id: 'notification.error', defaultMessage: 'An error occured' },
        });
      },
    }
  );

  const isLoading = [
    marketplacePluginsStatus,
    marketplaceProvidersStatus,
    installedPluginsStatus,
    appInfoStatus,
  ].includes('loading');

  const hasFailed = [
    marketplacePluginsStatus,
    marketplaceProvidersStatus,
    installedPluginsStatus,
    appInfoStatus,
  ].includes('error');

  useEffect(() => {
    trackUsageRef.current('didGoToMarketplace');
  }, []);

  useEffect(() => {
    if (!isInDevelopmentMode) {
      toggleNotification({
        type: 'info',
        message: {
          id: 'admin.pages.MarketPlacePage.production',
          defaultMessage: 'Manage plugins from the development environment',
        },
        blockTransition: true,
      });
    }
  }, [toggleNotification, isInDevelopmentMode]);

  if (!isOnline) {
    return (
      <Layout>
        <Main>
          <PageHeader isOnline={isOnline} />
          <Flex
            width="100%"
            direction="column"
            alignItems="center"
            justifyContent="center"
            style={{ paddingTop: '120px' }}
          >
            <Box paddingBottom={2}>
              <Typography textColor="neutral700" variant="alpha">
                {formatMessage({
                  id: 'admin.pages.MarketPlacePage.offline.title',
                  defaultMessage: 'You are offline',
                })}
              </Typography>
            </Box>
            <Box paddingBottom={6}>
              <Typography textColor="neutral700" variant="epsilon">
                {formatMessage({
                  id: 'admin.pages.MarketPlacePage.offline.subtitle',
                  defaultMessage:
                    'You need to be connected to the Internet to access Strapi Market.',
                })}
              </Typography>
            </Box>
            <img src={offlineCloud} alt="offline" style={{ width: '88px', height: '88px' }} />
          </Flex>
        </Main>
      </Layout>
    );
  }

  if (hasFailed) {
    return (
      <Layout>
        <ContentLayout>
          <Box paddingTop={8}>
            <AnErrorOccurred />
          </Box>
        </ContentLayout>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <Main aria-busy>
          <LoadingIndicatorPage />
        </Main>
      </Layout>
    );
  }

  // Search for plugins and providers that match the search query
  const pluginSearchResults = matchSearch(marketplacePluginsResponse.data, searchQuery);
  const providerSearchResults = matchSearch(marketplaceProvidersResponse.data, searchQuery);
  const emptySearchMessage = formatMessage(
    {
      id: 'admin.pages.MarketPlacePage.search.empty',
      defaultMessage: 'No result for "{target}"',
    },
    { target: searchQuery }
  );

  // Check if plugins are installed already
  const installedPluginNames = installedPluginsResponse.plugins.map(plugin => plugin.packageName);

  return (
    <Layout>
      <Main>
        <Helmet
          title={formatMessage({
            id: 'admin.pages.MarketPlacePage.helmet',
            defaultMessage: 'Marketplace - Plugins',
          })}
        />
        <PageHeader isOnline={isOnline} />
        <ContentLayout>
          <Box width="25%" paddingBottom={4}>
            <Searchbar
              name="searchbar"
              onClear={() => setSearchQuery('')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              clearLabel={formatMessage({
                id: 'admin.pages.MarketPlacePage.search.clear',
                defaultMessage: 'Clear the plugin search',
              })}
              placeholder={formatMessage({
                id: 'admin.pages.MarketPlacePage.search.placeholder',
                defaultMessage: 'Search for a plugin',
              })}
            >
              {formatMessage({
                id: 'admin.pages.MarketPlacePage.search.placeholder',
                defaultMessage: 'Search for a plugin',
              })}
            </Searchbar>
          </Box>
          <TabGroup
            label={formatMessage({
              id: 'admin.pages.MarketPlacePage.tab-group.label',
              defaultMessage: 'Plugins and Providers for Strapi',
            })}
            id="tabs"
            variant="simple"
          >
            <Box paddingBottom={4}>
              <Tabs>
                <Tab>
                  {formatMessage({
                    id: 'admin.pages.MarketPlacePage.plugins',
                    defaultMessage: 'Plugins',
                  })}{' '}
                  ({pluginSearchResults.length})
                </Tab>
                <Tab>
                  {formatMessage({
                    id: 'admin.pages.MarketPlacePage.providers',
                    defaultMessage: 'Providers',
                  })}{' '}
                  ({providerSearchResults.length})
                </Tab>
              </Tabs>
            </Box>
            <TabPanels>
              {/* Plugins panel */}
              <TabPanel>
                {searchQuery.length > 0 && !pluginSearchResults.length ? (
                  <EmptyNpmPackageSearch content={emptySearchMessage} />
                ) : (
                  <NpmPackagesGrid
                    npmPackages={pluginSearchResults}
                    installedPackageNames={installedPluginNames}
                    useYarn={appInfoResponse.data.useYarn}
                    isInDevelopmentMode={isInDevelopmentMode}
                    npmPackageType="plugin"
                  />
                )}
              </TabPanel>
              {/* Providers panel */}
              <TabPanel>
                {searchQuery.length > 0 && !providerSearchResults.length ? (
                  <EmptyNpmPackageSearch content={emptySearchMessage} />
                ) : (
                  <NpmPackagesGrid
                    npmPackages={providerSearchResults}
                    useYarn={appInfoResponse.data.useYarn}
                    isInDevelopmentMode={isInDevelopmentMode}
                    npmPackageType="provider"
                  />
                )}
              </TabPanel>
            </TabPanels>
          </TabGroup>
          <Box paddingTop={7}>
            <MissingPluginBanner />
          </Box>
        </ContentLayout>
      </Main>
    </Layout>
  );
};

const ProtectedMarketPlace = () => (
  <CheckPagePermissions permissions={adminPermissions.marketplace.main}>
    <MarketPlacePage />
  </CheckPagePermissions>
);

export { MarketPlacePage };
export default ProtectedMarketPlace;
