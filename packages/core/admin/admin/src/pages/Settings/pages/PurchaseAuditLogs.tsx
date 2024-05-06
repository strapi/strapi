import { Box, Main, EmptyStateLayout, LinkButton } from '@strapi/design-system';
import { ExternalLink } from '@strapi/icons';
import { EmptyPermissions } from '@strapi/icons/symbols';
import { useIntl } from 'react-intl';

import { Layouts } from '../../../components/Layouts/Layout';

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
        <Box paddingLeft={10} paddingRight={10}>
          <EmptyStateLayout
            icon={<EmptyPermissions width="16rem" />}
            content={formatMessage({
              id: 'Settings.permissions.auditLogs.not-available',
              defaultMessage:
                'Audit Logs is only available as part of a paid plan. Upgrade to get a searchable and filterable display of all activities.',
            })}
            action={
              <LinkButton
                variant="default"
                endIcon={<ExternalLink />}
                href="https://strp.cc/45mbAdF"
                isExternal
                target="_blank"
              >
                {formatMessage({
                  id: 'global.learn-more',
                  defaultMessage: 'Learn more',
                })}
              </LinkButton>
            }
          />
        </Box>
      </Main>
    </Layouts.Root>
  );
};

export { PurchaseAuditLogs };
