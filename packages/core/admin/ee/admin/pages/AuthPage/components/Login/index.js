import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Box, Flex, Divider, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import BaseLogin from '../../../../../../admin/src/pages/AuthPage/components/Login/BaseLogin';
import { useAuthProviders } from '../../../../hooks';
import UnauthenticatedLayout from '../../../../../../admin/src/layouts/UnauthenticatedLayout';
import SSOProviders from '../Providers/SSOProviders';

const DividerFull = styled(Divider)`
  flex: 1;
`;

const Login = (loginProps) => {
  const ssoEnabled = window.strapi.features.isEnabled(window.strapi.features.SSO);
  const { isLoading, data: providers } = useAuthProviders({ ssoEnabled });
  const { formatMessage } = useIntl();

  if (!ssoEnabled || (!isLoading && providers.length === 0)) {
    return (
      <UnauthenticatedLayout>
        <BaseLogin {...loginProps} />
      </UnauthenticatedLayout>
    );
  }

  return (
    <UnauthenticatedLayout>
      <BaseLogin {...loginProps}>
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
      </BaseLogin>
    </UnauthenticatedLayout>
  );
};

Login.defaultProps = {
  onSubmit: (e) => e.preventDefault(),
  requestError: null,
};

Login.propTypes = {
  formErrors: PropTypes.object.isRequired,
  modifiedData: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func,
  requestError: PropTypes.object,
};

export default Login;
