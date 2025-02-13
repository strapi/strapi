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
        <Box marginLeft={10} marginRight={10} shadow="filterShadow" hasRadius background="neutral0">
          <Grid.Root>
            <Grid.Item col={6} s={12}>
              <Flex direction="column" alignItems="flex-start" padding={7} gap={2}>
                <Flex>
                  <Lock fill="primary600" width={`24px`} height={`24px`} />
                </Flex>
                <Flex paddingTop={2} paddingBottom={4}>
                  <Typography variant="beta" fontWeight="bold">
                    Simplify authentication for your team
                  </Typography>
                </Flex>

                <Flex gap={2}>
                  <Check fill="success500" width={`16px`} height={`16px`} />
                  <Typography textColor="neutral700">Unified authentication</Typography>
                </Flex>

                <Flex gap={2}>
                  <Check fill="success500" width={`16px`} height={`16px`} />
                  <Typography textColor="neutral700">Enhanced security</Typography>
                </Flex>

                <Flex gap={2}>
                  <Check fill="success500" width={`16px`} height={`16px`} />
                  <Typography textColor="neutral700">Support for webhooks</Typography>
                </Flex>

                <Flex gap={2} marginTop={7}>
                  <LinkButton
                    variant="default"
                    href="https://strapi.io/pricing-self-hosted?utm_campaign=In-Product-CTA&utm_source=Single-sign-on"
                  >
                    Upgrade
                  </LinkButton>
                  <LinkButton
                    variant="tertiary"
                    endIcon={<ExternalLink />}
                    href="https://strapi.io/features/single-sign-on-sso?utm_campaign=In-Product-CTA&utm_source=Single-sign-on"
                  >
                    Learn more
                  </LinkButton>
                </Flex>
              </Flex>
            </Grid.Item>
            <Grid.Item col={6} s={12} background="primary100">
              <img src={illustration} alt="" width="auto" height="auto" />
            </Grid.Item>
          </Grid.Root>
        </Box>
      </Main>
    </Layouts.Root>
  );
};

export { PurchaseSingleSignOn };
