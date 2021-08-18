import React from 'react';
import { useIntl } from 'react-intl';
import { Box, H1, Text, Link, Main, Row } from '@strapi/parts';
import UnauthenticatedLayout, {
  Column,
  LayoutContent,
} from '../../../../layouts/UnauthenticatedLayout';
import Logo from '../Logo';

const ForgotPasswordSuccess = () => {
  const { formatMessage } = useIntl();

  return (
    <UnauthenticatedLayout>
      <Main labelledBy="email-sent">
        <LayoutContent>
          <Column>
            <Logo />
            <Box paddingTop="6" paddingBottom="7">
              <H1 id="email-sent">
                {formatMessage({ id: 'app.containers.AuthPage.ForgotPasswordSuccess.title' })}
              </H1>
            </Box>
            <Text>
              {formatMessage({
                id: 'app.containers.AuthPage.ForgotPasswordSuccess.text.email',
              })}
            </Text>
            <Box paddingTop={4}>
              <Text>
                {formatMessage({
                  id: 'app.containers.AuthPage.ForgotPasswordSuccess.text.contact-admin',
                })}
              </Text>
            </Box>
          </Column>
        </LayoutContent>
        <Row justifyContent="center">
          <Box paddingTop={4}>
            <Link to="/auth/login">
              <Text>{formatMessage({ id: 'Auth.link.signin' })}</Text>
            </Link>
          </Box>
        </Row>
      </Main>
    </UnauthenticatedLayout>
  );
};

export default ForgotPasswordSuccess;
