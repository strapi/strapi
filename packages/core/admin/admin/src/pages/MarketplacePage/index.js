import React, { useEffect } from 'react';
import { useIntl } from 'react-intl';
import styled from 'styled-components';
import { Helmet } from 'react-helmet';
import { pxToRem, CheckPagePermissions, useTracking } from '@strapi/helper-plugin';
import { Layout, HeaderLayout, ContentLayout } from '@strapi/design-system/Layout';
import { Flex } from '@strapi/design-system/Flex';
import { Box } from '@strapi/design-system/Box';
import { Stack } from '@strapi/design-system/Stack';
import { LinkButton } from '@strapi/design-system/LinkButton';
import { Main } from '@strapi/design-system/Main';
import { Typography } from '@strapi/design-system/Typography';
import ExternalLink from '@strapi/icons/ExternalLink';
import adminPermissions from '../../permissions';
import MarketplacePicture from './assets/marketplace-coming-soon.png';

const CenterTypography = styled(Typography)`
  text-align: center;
`;

const Img = styled.img`
  width: ${190 / 16}rem;
`;

const StackCentered = styled(Stack)`
  align-items: center;
`;

const MarketPlacePage = () => {
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();

  useEffect(() => {
    trackUsage('didGoToMarketplace');
  }, [trackUsage]);

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
            <StackCentered
              size={0}
              hasRadius
              background="neutral0"
              shadow="tableShadow"
              paddingTop={10}
              paddingBottom={10}
            >
              <Box paddingBottom={7}>
                <Img
                  alt={formatMessage({
                    id: 'admin.pages.MarketPlacePage.illustration',
                    defaultMessage: 'marketplace illustration',
                  })}
                  src={MarketplacePicture}
                />
              </Box>
              <Typography variant="alpha">
                {formatMessage({
                  id: 'admin.pages.MarketPlacePage.coming-soon.1',
                  defaultMessage: 'A new way to make Strapi awesome.',
                })}
              </Typography>
              <Typography variant="alpha" textColor="primary700">
                {formatMessage({
                  id: 'admin.pages.MarketPlacePage.published',
                  defaultMessage: 'Finally here.',
                })}
              </Typography>
              <Flex maxWidth={pxToRem(620)} paddingTop={3}>
                <CenterTypography variant="epsilon" textColor="neutral600">
                  {formatMessage({
                    id: 'admin.pages.MarketPlacePage.content.subtitle.published',
                    defaultMessage:
                      'The web marketplace helps you get the most of Strapi. In addition, we are working hard to offer the best experience to discover and install plugins, directly from the app.',
                  })}
                </CenterTypography>
              </Flex>
              <Stack paddingTop={6} horizontal size={2}>
                <LinkButton href="https://market.strapi.io" size="L" variant="primary" endIcon={<ExternalLink />}>
                  {formatMessage({
                    id: 'admin.pages.MarketPlacePage.submit.market.link',
                    defaultMessage: 'Visit the web marketplace',
                  })}
                </LinkButton>
                <LinkButton href="https://market.strapi.io/submit-plugin" size="L" variant="secondary">
                  {formatMessage({
                    id: 'admin.pages.MarketPlacePage.submit.plugin.link',
                    defaultMessage: 'Submit your plugin',
                  })}
                </LinkButton>
              </Stack>
            </StackCentered>
          </ContentLayout>
        </Main>
      </Layout>
    </CheckPagePermissions>
  );
};

export default MarketPlacePage;
