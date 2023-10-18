import React from 'react';

import { Box, Flex, Main, Typography } from '@strapi/design-system';
import { Link } from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';

import { Logo } from '../../../../components/UnauthenticatedLogo';
import {
  Column,
  LayoutContent,
  UnauthenticatedLayout,
} from '../../../../layouts/UnauthenticatedLayout';

const ForgotPasswordSuccess = () => {
  const { formatMessage } = useIntl();

  return (
    <UnauthenticatedLayout>
      <Main>
        <LayoutContent>
          <Column>
            <Logo />
            <Box paddingTop={6} paddingBottom={7}>
              <Typography as="h1" variant="alpha">
                {formatMessage({
                  id: 'app.containers.AuthPage.ForgotPasswordSuccess.title',
                  defaultMessage: 'Email sent',
                })}
              </Typography>
            </Box>
            <Typography>
              {formatMessage({
                id: 'app.containers.AuthPage.ForgotPasswordSuccess.text.email',
                defaultMessage: 'It can take a few minutes to receive your password recovery link.',
              })}
            </Typography>
            <Box paddingTop={4}>
              <Typography>
                {formatMessage({
                  id: 'app.containers.AuthPage.ForgotPasswordSuccess.text.contact-admin',
                  defaultMessage:
                    'If you do not receive this link, please contact your administrator.',
                })}
              </Typography>
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
