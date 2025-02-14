import { Layouts } from '@strapi/admin/strapi-admin';
import { Box, Main, Flex, Typography, Grid, LinkButton } from '@strapi/design-system';
import { ExternalLink, Check, Lightning } from '@strapi/icons';
import { useIntl } from 'react-intl';

import darkIllustration from '../assets/purchase-page-illustration-dark.svg';
import lightIllustration from '../assets/purchase-page-illustration-light.svg';
import { useTypedSelector } from '../modules/hooks';

const PurchaseReviewWorkflows = () => {
  const { formatMessage } = useIntl();
  const currentTheme = useTypedSelector((state) => state.admin_app.theme.currentTheme);

  const illustration = currentTheme === 'light' ? lightIllustration : darkIllustration;
  return (
    <Layouts.Root>
      <Main>
        <Layouts.Header
          title={formatMessage({
            id: 'Settings.review-workflows.list.page.title',
            defaultMessage: 'Review Workflows',
          })}
        />
        <Box marginLeft={10} marginRight={10} shadow="filterShadow" hasRadius background="neutral0">
          <Grid.Root>
            <Grid.Item col={6} s={12}>
              <Flex direction="column" alignItems="flex-start" padding={7} gap={2}>
                <Flex>
                  <Lightning fill="primary600" width={`24px`} height={`24px`} />
                </Flex>
                <Flex paddingTop={2} paddingBottom={4}>
                  <Typography variant="beta" fontWeight="bold">
                    Manage your content review process
                  </Typography>
                </Flex>

                <Flex gap={2}>
                  <Check fill="success500" width={`16px`} height={`16px`} />
                  <Typography textColor="neutral700">Customizable review stages</Typography>
                </Flex>

                <Flex gap={2}>
                  <Check fill="success500" width={`16px`} height={`16px`} />
                  <Typography textColor="neutral700">Manage user permissions</Typography>
                </Flex>

                <Flex gap={2}>
                  <Check fill="success500" width={`16px`} height={`16px`} />
                  <Typography textColor="neutral700">Support for webhooks</Typography>
                </Flex>

                <Flex gap={2} marginTop={7}>
                  <LinkButton
                    variant="default"
                    href="https://strapi.io/pricing-self-hosted?utm_campaign=In-Product-CTA&utm_source=Review%20Workflows"
                  >
                    Upgrade
                  </LinkButton>
                  <LinkButton
                    variant="tertiary"
                    endIcon={<ExternalLink />}
                    href="https://strapi.io/features/review-workflow?utm_campaign=In-Product-CTA&utm_source=Review%20Workflows"
                  >
                    Learn more
                  </LinkButton>
                </Flex>
              </Flex>
            </Grid.Item>
            <Grid.Item col={6} s={12} background="primary100">
              <img
                src={illustration}
                alt="purchase-page-review-workflows-illustration"
                width="auto"
                height="auto"
              />
            </Grid.Item>
          </Grid.Root>
        </Box>
      </Main>
    </Layouts.Root>
  );
};

export { PurchaseReviewWorkflows };
