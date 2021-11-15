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
                  id: 'admin.pages.MarketPlacePage.coming-soon.2',
                  defaultMessage: 'A new way to make Strapi awesome.',
                })}
              </Typography>
              <Flex maxWidth={pxToRem(580)} paddingTop={3}>
                <CenterTypography variant="epsilon" textColor="neutral600">
                  {formatMessage({
                    id: 'admin.pages.MarketPlacePage.content.subtitle',
                    defaultMessage:
                      'The new marketplace will help you get more out of Strapi. We are working hard to offer the best experience to discover and install plugins.',
                  })}
                </CenterTypography>
              </Flex>
              <Stack paddingTop={6} horizontal size={2}>
                {/* Temporarily hidden until we have the right URL for the link */}
                {/* <LinkButton href="https://strapi.io/" size="L" variant="secondary">
                  {formatMessage({
                    id: 'admin.pages.MarketPlacePage.submit.plugin.link',
                    defaultMessage: 'Submit your plugin',
                  })}
                </LinkButton> */}
                <LinkButton href="https://strapi.io/blog/strapi-market-is-coming-soon" size="L">
                  {formatMessage({
                    id: 'admin.pages.MarketPlacePage.blog.link',
                    defaultMessage: 'Read our blog post',
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
