import React from 'react';
import { useIntl } from 'react-intl';
import { Box } from '@strapi/design-system/Box';
import { Main } from '@strapi/design-system/Main';
import { Flex } from '@strapi/design-system/Flex';
import { Link } from '@strapi/design-system/Link';
import { H1, Text } from '@strapi/design-system/Text';
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
        <Flex justifyContent="center">
          <Box paddingTop={4}>
            <Link to="/auth/login">
              {formatMessage({ id: 'Auth.link.signin', defaultMessage: 'Sign in' })}
            </Link>
          </Box>
        </Flex>
      </Main>
    </UnauthenticatedLayout>
  );
};

export default ForgotPasswordSuccess;
