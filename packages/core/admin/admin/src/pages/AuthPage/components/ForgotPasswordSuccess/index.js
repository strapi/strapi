import React from 'react';
import { useIntl } from 'react-intl';
import { Box } from '@strapi/parts/Box';
import { Main } from '@strapi/parts/Main';
import { Row } from '@strapi/parts/Row';
import { Link } from '@strapi/parts/Link';
import { H1, Text } from '@strapi/parts/Text';
import UnauthenticatedLayout, {
  Column,
  LayoutContent,
} from '../../../../layouts/UnauthenticatedLayout';
import Logo from '../Logo';

const ForgotPasswordSuccess = () => {
  const { formatMessage } = useIntl();

  return (
    <UnauthenticatedLayout>
      <Main>
        <LayoutContent>
          <Column>
            <Logo />
            <Box paddingTop={6} paddingBottom={7}>
              <H1>
                {formatMessage({
                  id: 'app.containers.AuthPage.ForgotPasswordSuccess.title',
                  defaultMessage: 'Email sent',
                })}
              </H1>
            </Box>
            <Text>
              {formatMessage({
                id: 'app.containers.AuthPage.ForgotPasswordSuccess.text.email',
                defaultMessage: 'It can take a few minutes to receive your password recovery link.',
              })}
            </Text>
            <Box paddingTop={4}>
              <Text>
                {formatMessage({
                  id: 'app.containers.AuthPage.ForgotPasswordSuccess.text.contact-admin',
                  defaultMessage:
                    'If you do not receive this link, please contact your administrator.',
                })}
              </Text>
            </Box>
          </Column>
        </LayoutContent>
        <Row justifyContent="center">
          <Box paddingTop={4}>
            <Link to="/auth/login">
              <Text>{formatMessage({ id: 'Auth.link.signin', defaultMessage: 'Sign in' })}</Text>
            </Link>
          </Box>
        </Row>
      </Main>
    </UnauthenticatedLayout>
  );
};

export default ForgotPasswordSuccess;
