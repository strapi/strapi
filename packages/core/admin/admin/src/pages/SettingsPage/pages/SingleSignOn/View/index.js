import React from 'react';

import { Box, Layout, Main, HeaderLayout, EmptyStateLayout } from '@strapi/design-system';
import { LinkButton } from '@strapi/design-system/v2';
import { ExternalLink, EmptyPermissions } from '@strapi/icons';
import { useIntl } from 'react-intl';

const View = () => {
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
                href="https://strapi.io/pricing-self-hosted?utm_source=Strapi+Audit+Logs+CE+Settings+Page"
                isExternal
                target="_blank"
              >
                {formatMessage({
                  id: 'global.learn-more',
                  defaultMessage: 'See our Enterprise Pricing',
                })}
              </LinkButton>
            }
          />
        </Box>
      </Main>
    </Layout>
  );
};

export default View;
