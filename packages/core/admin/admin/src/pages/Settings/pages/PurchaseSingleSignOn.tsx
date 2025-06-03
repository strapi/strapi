import { Box, Main, Flex, Typography, Grid, LinkButton } from '@strapi/design-system';
import { ExternalLink, Check, Lock } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { Layouts } from '../../../components/Layouts/Layout';
import { useTypedSelector } from '../../../core/store/hooks';
import darkIllustration from '../assets/purchase-page-sso-illustration-dark.svg';
import lightIllustration from '../assets/purchase-page-sso-illustration-light.svg';

const PurchaseSingleSignOn = () => {
  const { formatMessage } = useIntl();
  const currentTheme = useTypedSelector((state) => state.admin_app.theme.currentTheme);

  const illustration = currentTheme === 'light' ? lightIllustration : darkIllustration;
  return (
    <Layouts.Root>
      <Main>
        <Layouts.Header
          title={formatMessage({
            id: 'Settings.sso.title',
            defaultMessage: 'Single Sign-On',
          })}
        />
        <Box
          marginLeft={10}
          marginRight={10}
          shadow="filterShadow"
          hasRadius
          background="neutral0"
          borderColor={'neutral150'}
          overflow={'hidden'}
        >
          <Grid.Root>
            <Grid.Item col={6} s={12} alignItems={'flex-start'}>
              <Flex direction="column" alignItems="flex-start" padding={7} width={'100%'}>
                <Flex>
                  <Lock fill="primary600" width={`24px`} height={`24px`} />
                </Flex>
                <Flex paddingTop={3} paddingBottom={4}>
                  <Typography variant="beta" fontWeight="bold">
                    {formatMessage({
                      id: 'Settings.page.PurchaseSSO.description',
                      defaultMessage: 'Simplify authentication for your team',
                    })}
                  </Typography>
                </Flex>
                <Flex direction="column" alignItems={'flex-start'} gap={2}>
                  <Flex gap={2}>
                    <Check
                      fill="success500"
                      width={`16px`}
                      height={`16px`}
                      style={{ flexShrink: 0 }}
                    />
                    <Typography textColor="neutral700">
                      {formatMessage({
                        id: 'Settings.page.PurchaseSSO.perks1',
                        defaultMessage: 'Unified authentication',
                      })}
                    </Typography>
                  </Flex>
                  <Flex gap={2}>
                    <Check
                      fill="success500"
                      width={`16px`}
                      height={`16px`}
                      style={{ flexShrink: 0 }}
                    />
                    <Typography textColor="neutral700">
                      {formatMessage({
                        id: 'Settings.page.PurchaseSSO.perks2',
                        defaultMessage: 'Enhanced security',
                      })}
                    </Typography>
                  </Flex>
                  <Flex gap={2}>
                    <Check
                      fill="success500"
                      width={`16px`}
                      height={`16px`}
                      style={{ flexShrink: 0 }}
                    />
                    <Typography textColor="neutral700">
                      {formatMessage({
                        id: 'Settings.page.PurchaseSSO.perks3',
                        defaultMessage: 'Support for webhooks',
                      })}
                    </Typography>
                  </Flex>{' '}
                </Flex>

                <Flex gap={2} marginTop={7}>
                  <LinkButton
                    variant="default"
                    href="https://strapi.io/pricing-self-hosted?utm_campaign=In-Product-CTA&utm_source=Single-sign-on"
                  >
                    {formatMessage({
                      id: 'Settings.page.purchase.upgrade.cta',
                      defaultMessage: 'Upgrade',
                    })}
                  </LinkButton>
                  <LinkButton
                    variant="tertiary"
                    endIcon={<ExternalLink />}
                    href="https://strapi.io/features/single-sign-on-sso?utm_campaign=In-Product-CTA&utm_source=Single-sign-on"
                  >
                    {formatMessage({
                      id: 'Settings.page.purchase.learn-more.cta',
                      defaultMessage: 'Learn more',
                    })}
                  </LinkButton>
                </Flex>
              </Flex>
            </Grid.Item>
            <Grid.Item col={6} s={12} background="primary100" minHeight={'280px'}>
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <img
                  src={illustration}
                  alt="purchase-page-sso-illustration"
                  width="100%"
                  height="100%"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'bottom left',
                  }}
                />
              </div>
            </Grid.Item>
          </Grid.Root>
        </Box>
      </Main>
    </Layouts.Root>
  );
};

export { PurchaseSingleSignOn };
