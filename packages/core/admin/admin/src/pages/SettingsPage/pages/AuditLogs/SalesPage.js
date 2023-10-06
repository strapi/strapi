import React from 'react';

import { Box, Layout, Main, HeaderLayout, EmptyStateLayout } from '@strapi/design-system';
import { LinkButton } from '@strapi/design-system/v2';
import { ExternalLink, EmptyPermissions } from '@strapi/icons';
import { useIntl } from 'react-intl';

const SalesPage = () => {
  const { formatMessage } = useIntl();

  return (
    <Layout>
      <Main>
        <HeaderLayout
          title={formatMessage({ id: 'global.auditLogs', defaultMessage: 'Audit Logs' })}
          subtitle={formatMessage({
            id: 'Settings.permissions.auditLogs.listview.header.subtitle',
            defaultMessage: 'Logs of all the activities that happened in your environment',
          })}
        />
        <Box paddingLeft={10} paddingRight={10}>
          <EmptyStateLayout
            icon={<EmptyPermissions width="10rem" />}
            content={formatMessage({
              id: 'Settings.permissions.auditLogs.not-available',
              defaultMessage:
                'Audit Logs is only available as part of the Enterprise Edition. Upgrade to get a searchable and filterable display of all activities.',
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
    </Layout>
  );
};

export default SalesPage;
