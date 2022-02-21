import React, { useEffect } from 'react';
import { useIntl } from 'react-intl';
import { Helmet } from 'react-helmet';
import {
  AnErrorOccurred,
  CheckPagePermissions,
  useFocusWhenNavigate,
  useTracking,
  LoadingIndicatorPage,
} from '@strapi/helper-plugin';
import { Grid, GridItem } from '@strapi/design-system/Grid';
import { Layout, HeaderLayout, ContentLayout } from '@strapi/design-system/Layout';
import { Main } from '@strapi/design-system/Main';
import adminPermissions from '../../permissions';
import PluginCard from './components/PluginCard';
import useFetchInstalledPlugins from '../../hooks/useFetchInstalledPlugins';
import useFetchMarketplacePlugins from '../../hooks/useFetchMarketplacePlugins';

const MarketPlacePage = () => {
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();

  useFocusWhenNavigate();

  const marketplaceTitle = formatMessage({
    id: 'admin.pages.MarketPlacePage.title',
    defaultMessage: 'Marketplace',
  });

  const pluginsTitle = formatMessage(
    {
      id: 'app.utils.notify.data-loaded',
      defaultMessage: 'The {target} has loaded',
    },
    { target: marketplaceTitle }
  );

  const {
    status: marketplacePluginsStatus,
    data: marketplacePluginsResponse,
  } = useFetchMarketplacePlugins(pluginsTitle);
  const {
    status: installedPluginsStatus,
    data: installedPluginsResponse,
  } = useFetchInstalledPlugins();

  const isLoading = marketplacePluginsStatus === 'loading' || installedPluginsStatus === 'loading';
  const hasFailed = marketplacePluginsStatus === 'error' || installedPluginsStatus === 'error';

  useEffect(() => {
    trackUsage('didGoToMarketplace');
  }, [trackUsage]);

  if (hasFailed) {
    return (
      <Layout>
        <AnErrorOccurred />
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

  const installedPlugins = installedPluginsResponse.plugins.map(plugin => plugin.packageName);

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
            id: 'admin.pages.MarketPlacePage.title',
            defaultMessage: 'Marketplace',
          })}
          subtitle={formatMessage({
            id: 'admin.pages.MarketPlacePage.subtitle',
            defaultMessage: 'Get more out of Strapi',
          })}
        />
        <ContentLayout>
          <Grid gap={4}>
            {marketplacePluginsResponse.data.map(plugin => (
              <GridItem col={4} s={6} xs={12} style={{ height: '100%' }} key={plugin.id}>
                <PluginCard plugin={plugin} installedPlugins={installedPlugins} />
              </GridItem>
            ))}
          </Grid>
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
