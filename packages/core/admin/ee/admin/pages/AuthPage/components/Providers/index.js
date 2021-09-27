import React from 'react';
import { Redirect, useHistory } from 'react-router-dom';
import styled from 'styled-components';
import { Divider } from '@strapi/parts/Divider';
import { Stack } from '@strapi/parts/Stack';
import { Row } from '@strapi/parts/Row';
import { Box } from '@strapi/parts/Box';
import { Button } from '@strapi/parts/Button';
import { Link } from '@strapi/parts/Link';
import { Loader } from '@strapi/parts/Loader';
import { TableLabel, H1, Text, Subtitle } from '@strapi/parts/Text';
import { Main } from '@strapi/parts/Main';
import { useIntl } from 'react-intl';
import { useAuthProviders } from '../../../../hooks';
import UnauthenticatedLayout, {
  Column,
  LayoutContent,
} from '../../../../../../admin/src/layouts/UnauthenticatedLayout';
import SSOProviders from './SSOProviders';
import Logo from '../../../../../../admin/src/pages/AuthPage/components/Logo';

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
              <H1>{formatMessage({ id: 'Auth.form.welcome.title' })}</H1>
            </Box>
            <Box paddingBottom={7}>
              <Subtitle textColor="neutral600">
                {formatMessage({ id: 'Auth.login.sso.subtitle' })}
              </Subtitle>
            </Box>
          </Column>
          <Stack size={7}>
            {isLoading ? (
              <Row justifyContent="center">
                <Loader>{formatMessage({ id: 'Auth.login.sso.loading' })}</Loader>
              </Row>
            ) : (
              <SSOProviders providers={providers} />
            )}
            <Row>
              <DividerFull />
              <Box paddingLeft={3} paddingRight={3}>
                <TableLabel textColor="neutral600">{formatMessage({ id: 'or' })}</TableLabel>
              </Box>
              <DividerFull />
            </Row>
            <Button fullWidth size="L" onClick={handleClick}>
              {formatMessage({ id: 'Auth.form.button.login.strapi' })}
            </Button>
          </Stack>
        </LayoutContent>
        <Row justifyContent="center">
          <Box paddingTop={4}>
            <Link to="/auth/forgot-password">
              <Text small>{formatMessage({ id: 'Auth.link.forgot-password' })}</Text>
            </Link>
          </Box>
        </Row>
      </Main>
    </UnauthenticatedLayout>
  );
};

export default Providers;
