import React from 'react';
import { Redirect, useHistory } from 'react-router-dom';
import styled from 'styled-components';
import { Divider } from '@strapi/design-system/Divider';
import { Stack } from '@strapi/design-system/Stack';
import { Flex } from '@strapi/design-system/Flex';
import { Box } from '@strapi/design-system/Box';
import { Button } from '@strapi/design-system/Button';
import { Link } from '@strapi/design-system/Link';
import { Loader } from '@strapi/design-system/Loader';
import { Typography } from '@strapi/design-system/Typography';
import { Main } from '@strapi/design-system/Main';
import { useIntl } from 'react-intl';
import { useAuthProviders } from '../../../../hooks';
import UnauthenticatedLayout, {
  Column,
  LayoutContent,
} from '../../../../../../admin/src/layouts/UnauthenticatedLayout';
import SSOProviders from './SSOProviders';
import Logo from '../../../../../../admin/src/components/UnauthenticatedLogo';

const DividerFull = styled(Divider)`
  flex: 1;
`;

const Providers = () => {
  const ssoEnabled = strapi.features.isEnabled(strapi.features.SSO);

  const { push } = useHistory();
  const { formatMessage } = useIntl();
  const { isLoading, data: providers } = useAuthProviders({ ssoEnabled });

  const handleClick = () => {
    push('/auth/login');
  };

  if (!ssoEnabled || (!isLoading && providers.length === 0)) {
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
          <Stack spacing={7}>
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
          </Stack>
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
