import React from 'react';

import { Box, Flex, Layout, Main, Typography } from '@strapi/design-system';
import { pxToRem } from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';

import offlineCloud from '../../../../assets/images/icon_offline-cloud.svg';
import PageHeader from '../PageHeader';

const OfflineLayout = () => {
  const { formatMessage } = useIntl();

  return (
    <Layout>
      <Main>
        <PageHeader isOnline={false} />
        <Flex
          width="100%"
          direction="column"
          alignItems="center"
          justifyContent="center"
          paddingTop={pxToRem(120)}
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
                defaultMessage: 'You need to be connected to the Internet to access Strapi Market.',
              })}
            </Typography>
          </Box>
          <img src={offlineCloud} alt="offline" style={{ width: '88px', height: '88px' }} />
        </Flex>
      </Main>
    </Layout>
  );
};

export default OfflineLayout;
