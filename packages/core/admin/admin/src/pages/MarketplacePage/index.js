import React, { useEffect } from 'react';
import { useIntl } from 'react-intl';
import { useQuery } from 'react-query';
import { Helmet } from 'react-helmet';
import {
  CheckPagePermissions,
  useTracking,
  LoadingIndicatorPage,
  useNotification,
} from '@strapi/helper-plugin';
import { useNotifyAT } from '@strapi/design-system/LiveRegions';
import { Grid, GridItem } from '@strapi/design-system/Grid';
import { Layout, HeaderLayout, ContentLayout } from '@strapi/design-system/Layout';
import { Main } from '@strapi/design-system/Main';
import { fetchPlugins } from './utils/api';
import adminPermissions from '../../permissions';
import PluginCard from './components/PluginCard';

const MarketPlacePage = () => {
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const toggleNotification = useNotification();
  const { notifyStatus } = useNotifyAT();

  const title = formatMessage({
    id: 'admin.pages.MarketPlacePage.title',
    defaultMessage: 'Marketplace',
  });

  const notifyLoad = () => {
    notifyStatus(
      formatMessage(
        {
          id: 'app.utils.notify.data-loaded',
          defaultMessage: 'The {target} has loaded',
        },
        { target: title }
      )
    );
  };

  const { status, data: pluginsResponse } = useQuery(
    'list-plugins',
    () => fetchPlugins(notifyLoad),
    {
      onError: () => {
        toggleNotification({
          type: 'warning',
          message: { id: 'notification.error', defaultMessage: 'An error occured' },
        });
      },
    }
  );

  const isLoading = status !== 'success' && status !== 'error';

  useEffect(() => {
    trackUsage('didGoToMarketplace');
  }, [trackUsage]);

  if (isLoading) {
    return (
      <Layout>
        <Main aria-busy>
          <LoadingIndicatorPage />
        </Main>
      </Layout>
    );
  }

  return (
    <CheckPagePermissions permissions={adminPermissions.marketplace.main}>
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
              {pluginsResponse.data.map(plugin => (
                <GridItem col={4} s={6} xs={12} key={plugin.id} style={{ height: '100%' }}>
                  <PluginCard plugin={plugin} />
                </GridItem>
              ))}
            </Grid>
          </ContentLayout>
        </Main>
      </Layout>
    </CheckPagePermissions>
  );
};

export default MarketPlacePage;
