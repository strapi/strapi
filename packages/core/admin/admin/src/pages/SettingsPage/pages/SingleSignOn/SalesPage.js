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
            id: 'Settings.sso.title',
            defaultMessage: 'Single Sign-On',
          })}
          subtitle={formatMessage({
            id: 'Settings.sso.subTitle',
            defaultMessage: 'Configure the settings for the Single Sign-On feature.',
          })}
        />
        <Box paddingLeft={10} paddingRight={10}>
          <EmptyStateLayout
            icon={<EmptyPermissions width="10rem" />}
            content={formatMessage({
              id: 'Settings.sso.not-available',
              defaultMessage:
                'SSO is only available as part of the Enterprise Edition. Upgrade to configure additional sign-in & sign-up methods for your administration panel.',
            })}
            action={
              <LinkButton
                variant="default"
                endIcon={<ExternalLink />}
                href="https://strp.cc/46Fk1BA"
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
