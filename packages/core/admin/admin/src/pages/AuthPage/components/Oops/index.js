import React from 'react';
import { useIntl } from 'react-intl';
import { useQuery } from '@strapi/helper-plugin';
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
      <Main>
        <LayoutContent>
          <Column>
            <Logo />
            <Box paddingTop={6} paddingBottom={7}>
              <H1>
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

export default Oops;
