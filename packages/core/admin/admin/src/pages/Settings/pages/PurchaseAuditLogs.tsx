import { Box, Main, Flex, Typography, Grid, LinkButton } from '@strapi/design-system';
import { ExternalLink, Check, ListSearch } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { Layouts } from '../../../components/Layouts/Layout';
import { useTypedSelector } from '../../../core/store/hooks';
import darkIllustration from '../assets/purchase-page-audit-logs-illustration-dark.svg';
import lightIllustration from '../assets/purchase-page-audit-logs-illustration-light.svg';

const PurchaseAuditLogs = () => {
  const { formatMessage } = useIntl();
  const currentTheme = useTypedSelector((state) => state.admin_app.theme.currentTheme);

  const illustration = currentTheme === 'light' ? lightIllustration : darkIllustration;
  return (
    <Layouts.Root>
      <Main>
        <Layouts.Header
          title={formatMessage({ id: 'global.auditLogs', defaultMessage: 'Audit Logs' })}
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
                  <ListSearch fill="primary600" width={`24px`} height={`24px`} />
                </Flex>
                <Flex paddingTop={3} paddingBottom={4}>
                  <Typography variant="beta" fontWeight="bold">
                    {formatMessage({
                      id: 'Settings.page.PurchaseAudit-logs.description',
                      defaultMessage: 'Track and review changes with your team',
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
                        id: 'Settings.page.PurchaseAudit-logs.perks1',
                        defaultMessage: 'Easily track changes',
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
                        id: 'Settings.page.PurchaseAudit-logs.perks2',
                        defaultMessage: 'Review changes with ease',
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
                        id: 'Settings.page.PurchaseAudit-logs.perks3',
                        defaultMessage: 'Maintain security and compliance',
                      })}
                    </Typography>
                  </Flex>
                </Flex>
                <Flex gap={2} marginTop={7}>
                  <LinkButton
                    variant="default"
                    href="https://strapi.io/pricing-self-hosted?utm_campaign=In-Product-CTA&utm_source=Audit-Logs"
                  >
                    {formatMessage({
                      id: 'Settings.page.purchase.upgrade.cta',
                      defaultMessage: 'Upgrade',
                    })}
                  </LinkButton>
                  <LinkButton
                    variant="tertiary"
                    endIcon={<ExternalLink />}
                    href="https://strapi.io/features/audit-logs?utm_campaign=In-Product-CTA&utm_source=Audit-Logs"
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
                  alt="purchase-page-audit-logs-illustration"
                  width="100%"
                  height="100%"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'top left',
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

export { PurchaseAuditLogs };
