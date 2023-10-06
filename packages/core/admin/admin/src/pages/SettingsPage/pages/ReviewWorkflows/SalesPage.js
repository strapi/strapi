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
          title={formatMessage({
            id: 'Settings.review-workflows.list.page.title',
            defaultMessage: 'Review Workflows',
          })}
          subtitle={formatMessage({
            id: 'Settings.review-workflows.list.page.subtitle',
            defaultMessage: 'Manage your content review process',
          })}
        />
        <Box paddingLeft={10} paddingRight={10}>
          <EmptyStateLayout
            icon={<EmptyPermissions width="10rem" />}
            content={formatMessage({
              id: 'Settings.review-workflows.not-available',
              defaultMessage:
                'Review Workflows is only available as part of the Enterprise Edition. Upgrade to create and manage workflows.',
            })}
            action={
              <LinkButton
                variant="default"
                endIcon={<ExternalLink />}
                href="https://strp.cc/3tdNfJqe"
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
