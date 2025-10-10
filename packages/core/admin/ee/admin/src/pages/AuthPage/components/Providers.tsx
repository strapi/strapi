import { Box, Button, Divider, Flex, Loader, Main, Typography, Link } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { NavLink, Navigate, useNavigate } from 'react-router-dom';
import { styled } from 'styled-components';

import { Logo } from '../../../../../../admin/src/components/UnauthenticatedLogo';
import {
  Column,
  LayoutContent,
  UnauthenticatedLayout,
} from '../../../../../../admin/src/layouts/UnauthenticatedLayout';
import { useGetProvidersQuery } from '../../../../../../admin/src/services/auth';

import { SSOProviders } from './SSOProviders';

const Providers = () => {
  const navigate = useNavigate();
  const { formatMessage } = useIntl();
  const { isLoading, data: providers = [] } = useGetProvidersQuery(undefined, {
    skip: !window.strapi.features.isEnabled(window.strapi.features.SSO),
  });

  const handleClick = () => {
    navigate('/auth/login');
  };

  if (
    !window.strapi.features.isEnabled(window.strapi.features.SSO) ||
    (!isLoading && providers.length === 0)
  ) {
    return <Navigate to="/auth/login" />;
  }

  return (
    <UnauthenticatedLayout>
      <Main>
        <LayoutContent>
          <Column>
            <Logo />
            <Box paddingTop={6} paddingBottom={1}>
              <Typography tag="h1" variant="alpha">
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
            <Link tag={NavLink} to="/auth/forgot-password">
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

const DividerFull = styled(Divider)`
  flex: 1;
`;

export { Providers };
