import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Box } from '@strapi/parts/Box';
import { Row } from '@strapi/parts/Row';
import { Divider } from '@strapi/parts/Divider';
import { Stack } from '@strapi/parts/Stack';
import { TableLabel } from '@strapi/parts/Text';
import { useIntl } from 'react-intl';
import BaseLogin from '../../../../../../admin/src/pages/AuthPage/components/Login/BaseLogin';
import { useAuthProviders } from '../../../../hooks';
import UnauthenticatedLayout from '../../../../../../admin/src/layouts/UnauthenticatedLayout';
import SSOProviders from '../Providers/SSOProviders';

const DividerFull = styled(Divider)`
  flex: 1;
`;

const Login = loginProps => {
  const ssoEnabled = strapi.features.isEnabled(strapi.features.SSO);
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
          <Stack size={7}>
            <Row>
              <DividerFull />
              <Box paddingLeft={3} paddingRight={3}>
                <TableLabel textColor="neutral600">
                  {formatMessage({ id: 'Auth.login.sso.divider' })}
                </TableLabel>
              </Box>
              <DividerFull />
            </Row>
            <SSOProviders providers={providers} displayAllProviders={false} />
          </Stack>
        </Box>
      </BaseLogin>
    </UnauthenticatedLayout>
  );
};

Login.defaultProps = {
  onSubmit: e => e.preventDefault(),
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
