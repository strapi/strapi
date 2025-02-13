import { Layouts } from '@strapi/admin/strapi-admin';
import { Box, Main, Flex, Typography, Grid, LinkButton } from '@strapi/design-system';
import { ExternalLink, Check, Lightning } from '@strapi/icons';
import { useIntl } from 'react-intl';

import illustration from '../assets/purchase-page-audit-logs-illustration.svg';

const PurchaseAuditLogs = () => {
  const { formatMessage } = useIntl();

  return (
    <Layouts.Root>
      <Main>
        <Layouts.Header
          title={formatMessage({ id: 'global.auditLogs', defaultMessage: 'Audit Logs' })}
          subtitle={formatMessage({
            id: 'Settings.permissions.auditLogs.listview.header.subtitle',
            defaultMessage: 'Logs of all the activities that happened in your environment',
          })}
        />
        <Box marginLeft={10} marginRight={10} shadow="filterShadow" hasRadius background="neutral0">
          <Grid.Root>
            <Grid.Item col={6} s={12}>
              <Flex direction="column" alignItems="flex-start" padding={7} gap={2}>
                <Flex>
                  <Lightning fill="primary600" width={`24px`} height={`24px`} />
                </Flex>
                <Flex paddingTop={2} paddingBottom={2}>
                  <Typography variant="beta" fontWeight="bold">
                    Track and review changes with your team
                  </Typography>
                </Flex>

                <Flex gap={1}>
                  <Check fill="success500" width={`16px`} height={`16px`} />
                  <Typography textColor="neutral700">Easily track changes</Typography>
                </Flex>

                <Flex gap={1}>
                  <Check fill="success500" width={`16px`} height={`16px`} />
                  <Typography textColor="neutral700">Review changes with ease</Typography>
                </Flex>

                <Flex gap={1}>
                  <Check fill="success500" width={`16px`} height={`16px`} />
                  <Typography textColor="neutral700">Maintain security and compliance</Typography>
                </Flex>

                <Flex gap={3} marginTop={4}>
                  <LinkButton
                    variant="default"
                    href="https://strapi.io/pricing-self-hosted?utm_campaign=In-Product-CTA&utm_source=Audit-Logs"
                  >
                    Upgrade
                  </LinkButton>
                  <LinkButton
                    variant="tertiary"
                    endIcon={<ExternalLink />}
                    href="https://strapi.io/features/audit-logs?utm_campaign=In-Product-CTA&utm_source=Audit-Logs"
                  >
                    Learn more
                  </LinkButton>
                </Flex>
              </Flex>
            </Grid.Item>
            <Grid.Item col={6} s={12} background="primary100">
              <img src={illustration} alt="" width={'100%'} height="auto" />
            </Grid.Item>
          </Grid.Root>
        </Box>
      </Main>
    </Layouts.Root>
  );
};

export { PurchaseAuditLogs };
