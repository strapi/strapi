import React from 'react';

import { Box, Button, Divider, Flex, Loader, Main, Typography } from '@strapi/design-system';
import { Link } from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';
import { Redirect, useHistory } from 'react-router-dom';
import styled from 'styled-components';

import Logo from '../../../../../../admin/src/components/UnauthenticatedLogo';
import UnauthenticatedLayout, {
  Column,
  LayoutContent,
} from '../../../../../../admin/src/layouts/UnauthenticatedLayout';
import { useAuthProviders } from '../../../../hooks/useAuthProviders';

import SSOProviders from './SSOProviders';

const DividerFull = styled(Divider)`
  flex: 1;
`;

const Providers = () => {
  const { push } = useHistory();
  const { formatMessage } = useIntl();
  const { isLoading, providers } = useAuthProviders({
    enabled: window.strapi.features.isEnabled(window.strapi.features.SSO),
  });

  const handleClick = () => {
    push('/auth/login');
  };

  if (
    !window.strapi.features.isEnabled(window.strapi.features.SSO) ||
    (!isLoading && providers.length === 0)
  ) {
    return <Redirect to="/auth/login" />;
  }

  return (
    <UnauthenticatedLayout>
      <Main>
        <LayoutContent>
          <Column>
            <Logo />
            <Box paddingTop={6} paddingBottom={1}>
              <Typography as="h1" variant="alpha">
                {formatMessage({ id: 'Auth.form.welcome.title' })}
              </Typography>
            </Box>
            <Box paddingBottom={7}>
              <Typography variant="epsilon" textColor="neutral600">
                {formatMessage({ id: 'Auth.login.sso.subtitle' })}
              </Typography>
            </Box>
          </Column>
          <Flex direction="column" alignItems="stretch" gap={7}>
            {isLoading ? (
              <Flex justifyContent="center">
                <Loader>{formatMessage({ id: 'Auth.login.sso.loading' })}</Loader>
              </Flex>
            ) : (
              <SSOProviders providers={providers} />
            )}
            <Flex>
              <DividerFull />
              <Box paddingLeft={3} paddingRight={3}>
                <Typography variant="sigma" textColor="neutral600">
                  {formatMessage({ id: 'or' })}
                </Typography>
              </Box>
              <DividerFull />
            </Flex>
            <Button fullWidth size="L" onClick={handleClick}>
              {formatMessage({ id: 'Auth.form.button.login.strapi' })}
            </Button>
          </Flex>
        </LayoutContent>
        <Flex justifyContent="center">
          <Box paddingTop={4}>
            <Link to="/auth/forgot-password">
              <Typography variant="pi">
                {formatMessage({ id: 'Auth.link.forgot-password' })}
              </Typography>
            </Link>
          </Box>
        </Flex>
      </Main>
    </UnauthenticatedLayout>
  );
};

export default Providers;
