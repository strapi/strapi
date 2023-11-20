import { Box, Flex, Main, Typography } from '@strapi/design-system';
import { Link } from '@strapi/design-system/v2';
import { useQuery } from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';
import { NavLink } from 'react-router-dom';

import { Logo } from '../../../components/UnauthenticatedLogo';
import {
  Column,
  LayoutContent,
  UnauthenticatedLayout,
} from '../../../layouts/UnauthenticatedLayout';

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
              <Typography as="h1" variant="alpha">
                {formatMessage({ id: 'Auth.components.Oops.title', defaultMessage: 'Oops...' })}
              </Typography>
            </Box>
            <Typography>{message}</Typography>
            <Box paddingTop={4}>
              <Typography>
                {formatMessage({
                  id: 'Auth.components.Oops.text.admin',
                  defaultMessage: 'If this is a mistake, please contact your administrator.',
                })}
              </Typography>
            </Box>
          </Column>
        </LayoutContent>
        <Flex justifyContent="center">
          <Box paddingTop={4}>
            {/* @ts-expect-error – error with inferring the props from the as component */}
            <Link as={NavLink} to="/auth/login">
              {formatMessage({ id: 'Auth.link.signin', defaultMessage: 'Sign in' })}
            </Link>
          </Box>
        </Flex>
      </Main>
    </UnauthenticatedLayout>
  );
};

export { Oops };
