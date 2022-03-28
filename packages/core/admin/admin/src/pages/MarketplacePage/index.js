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
import { Grid, GridItem } from '@strapi/design-system/Grid';
import { Layout, HeaderLayout, ContentLayout } from '@strapi/design-system/Layout';
import { Main } from '@strapi/design-system/Main';
import { Searchbar } from '@strapi/design-system/Searchbar';
import { Box } from '@strapi/design-system/Box';
import { LinkButton } from '@strapi/design-system/LinkButton';
import { useNotifyAT } from '@strapi/design-system/LiveRegions';
import Upload from '@strapi/icons/Upload';

import PluginCard from './components/PluginCard';
import { EmptyPluginSearch } from './components/EmptyPluginSearch';
import { fetchAppInformation } from './utils/api';
import useFetchInstalledPlugins from '../../hooks/useFetchInstalledPlugins';
import useFetchMarketplacePlugins from '../../hooks/useFetchMarketplacePlugins';
import adminPermissions from '../../permissions';

const matchSearch = (plugins, search) => {
  return matchSorter(plugins, search, {
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

  const isLoading = [marketplacePluginsStatus, installedPluginsStatus, appInfoStatus].includes(
    'loading'
  );

  const hasFailed = [marketplacePluginsStatus, installedPluginsStatus, appInfoStatus].includes(
    'error'
  );

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

  const searchResults = matchSearch(marketplacePluginsResponse.data, searchQuery);
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
        <HeaderLayout
          title={formatMessage({
            id: 'global.marketplace',
            defaultMessage: 'Marketplace',
          })}
          subtitle={formatMessage({
            id: 'admin.pages.MarketPlacePage.subtitle',
            defaultMessage: 'Get more out of Strapi',
          })}
          primaryAction={
            <LinkButton
              startIcon={<Upload />}
              variant="tertiary"
              href="https://market.strapi.io/submit-plugin"
              onClick={() => trackUsage('didSubmitPlugin')}
            >
              {formatMessage({
                id: 'admin.pages.MarketPlacePage.submit.plugin.link',
                defaultMessage: 'Submit your plugin',
              })}
            </LinkButton>
          }
        />
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
          {searchQuery.length > 0 && !searchResults.length ? (
            <EmptyPluginSearch
              content={formatMessage(
                {
                  id: 'admin.pages.MarketPlacePage.search.empty',
                  defaultMessage: 'No result for "{target}"',
                },
                { target: searchQuery }
              )}
            />
          ) : (
            <Grid gap={4}>
              {searchResults.map(plugin => (
                <GridItem col={4} s={6} xs={12} style={{ height: '100%' }} key={plugin.id}>
                  <PluginCard
                    plugin={plugin}
                    installedPluginNames={installedPluginNames}
                    useYarn={appInfoResponse.data.useYarn}
                    isInDevelopmentMode={isInDevelopmentMode}
                  />
                </GridItem>
              ))}
            </Grid>
          )}
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
