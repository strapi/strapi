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
import { Box } from '@strapi/design-system/Box';
import { Layout, HeaderLayout, ContentLayout } from '@strapi/design-system/Layout';
import { Main } from '@strapi/design-system/Main';
import styled from 'styled-components';
import { fetchPlugins } from './utils/api';
import adminPermissions from '../../permissions';
import PluginCard from './PluginCard';

const GridLayout = styled(Box)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  grid-gap: ${({ theme }) => theme.spaces[4]};
`;

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

  // TODO: Remove when using data, logging for now to avoid lint error
  console.log('plugins', pluginsResponse);

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
            <GridLayout>
              {pluginsResponse.data
                .filter(plugin => plugin.attributes.strapiCompatibility === 'v4')
                .map(plugin => (
                  <PluginCard plugin={plugin} key={plugin.id} />
                ))}
            </GridLayout>
          </ContentLayout>
        </Main>
      </Layout>
    </CheckPagePermissions>
  );
};

export default MarketPlacePage;
