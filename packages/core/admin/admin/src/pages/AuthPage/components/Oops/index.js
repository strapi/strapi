import React from 'react';
import { useIntl } from 'react-intl';
import { useQuery } from '@strapi/helper-plugin';
import { Box, H1, Text, Link, Main, Row } from '@strapi/parts';
import UnauthenticatedLayout, {
  Column,
  LayoutContent,
} from '../../../../layouts/UnauthenticatedLayout';
import Logo from '../Logo';

const Oops = () => {
  const { formatMessage } = useIntl();
  const query = useQuery();

  const message =
    query.get('info') ||
    formatMessage({
      id: 'Auth.components.Oops.text',
      defaultMessage: 'Your account has been suspended.',
    });

  return (
    <UnauthenticatedLayout>
      <Main labelledBy="email-sent">
        <LayoutContent>
          <Column>
            <Logo />
            <Box paddingTop={6} paddingBottom={7}>
              <H1 id="email-sent">
                {formatMessage({ id: 'Auth.components.Oops.title', defaultMessage: 'Oops...' })}
              </H1>
            </Box>
            <Text>{message}</Text>
            <Box paddingTop={4}>
              <Text>
                {formatMessage({
                  id: 'Auth.components.Oops.text.admin',
                  defaultMessage: 'If this is a mistake, please contact your administrator.',
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

export default Oops;
