import React from 'react';
import PropTypes from 'prop-types';
import { useTheme } from 'styled-components';
import { Link } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { Flex, Padded, Separator } from '@buffetjs/core';
import { LoadingIndicator, Tooltip } from '@buffetjs/styles';
import { Dots } from '@buffetjs/icons';
import { BaselineAlignment } from 'strapi-helper-plugin';

import BaseLogin from '../../../../../../admin/src/containers/AuthPage/components/Login/BaseLogin';
import ProviderButton from '../../../../components/ProviderButton';
import {
  ProviderButtonWrapper,
  ProviderLink,
} from '../../../../components/ProviderButton/ProviderButtonStyles';
import { useAuthProviders } from '../../../../hooks';

const Login = loginProps => {
  const ssoEnabled = ENABLED_EE_FEATURES.includes('sso');

  const theme = useTheme();
  const { isLoading, data: providers } = useAuthProviders({ ssoEnabled });
  const { formatMessage } = useIntl();

  if (!ssoEnabled || (!isLoading && providers.length === 0)) {
    return <BaseLogin {...loginProps} />;
  }

  return (
    <BaseLogin {...loginProps}>
      <Padded top size="md">
        <BaselineAlignment top size="6px" />
        <Separator
          label={formatMessage({
            id: 'or',
            defaultMessage: 'OR',
          })}
        />
        <Padded bottom size="md" />
        {isLoading ? (
          <LoadingIndicator />
        ) : (
          <Flex justifyContent="center">
            {providers.slice(0, 2).map((provider, index) => (
              <Padded key={provider.uid} left={index !== 0} right size="xs">
                <ProviderButton provider={provider} />
              </Padded>
            ))}
            {providers.length > 2 && (
              <Padded left size="xs">
                <ProviderLink as={Link} to="/auth/providers">
                  <ProviderButtonWrapper
                    justifyContent="center"
                    alignItems="center"
                    data-for="see-more-tooltip"
                    data-tip={formatMessage({
                      id: 'Auth.form.button.login.providers.see-more',
                      defaultMessage: 'See more',
                    })}
                  >
                    <Dots width="18" height="8" fill={theme.main.colors.black} />
                  </ProviderButtonWrapper>
                </ProviderLink>
                <Tooltip id="see-more-tooltip" />
              </Padded>
            )}
          </Flex>
        )}
      </Padded>
    </BaseLogin>
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
