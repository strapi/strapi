import { Box, Divider, Flex, Typography } from '@strapi/design-system';
import { useFetchClient } from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';
import { useQuery } from 'react-query';
import styled from 'styled-components';

import { Login, LoginProps } from '../../../../../../admin/src/pages/Auth/components/Login';

import { SSOProviders } from './SSOProviders';

const DividerFull = styled(Divider)`
  flex: 1;
`;

const LoginEE = (loginProps: LoginProps) => {
  const { formatMessage } = useIntl();
  const { get } = useFetchClient();
  const { isLoading, data: providers = [] } = useQuery(
    ['ee', 'providers'],
    async () => {
      const { data } = await get('/admin/providers');

      return data;
    },
    {
      enabled: window.strapi.features.isEnabled(window.strapi.features.SSO),
    }
  );

  if (
    !window.strapi.features.isEnabled(window.strapi.features.SSO) ||
    (!isLoading && providers.length === 0)
  ) {
    return <Login {...loginProps} />;
  }

  return (
    <Login {...loginProps}>
      <Box paddingTop={7}>
        <Flex direction="column" alignItems="stretch" gap={7}>
          <Flex>
            <DividerFull />
            <Box paddingLeft={3} paddingRight={3}>
              <Typography variant="sigma" textColor="neutral600">
                {formatMessage({ id: 'Auth.login.sso.divider' })}
              </Typography>
            </Box>
            <DividerFull />
          </Flex>
          <SSOProviders providers={providers} displayAllProviders={false} />
        </Flex>
      </Box>
    </Login>
  );
};

export { LoginEE };
