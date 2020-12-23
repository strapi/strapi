import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { Flex, Padded, Text } from '@buffetjs/core';
import { LoadingIndicator } from '@buffetjs/styles';
import { BaselineAlignment } from 'strapi-helper-plugin';

import BaseLogin from '../../../../../../admin/src/containers/AuthPage/components/Login/BaseLogin';
import Tooltip from '../../../../../../admin/src/components/Tooltip';
import Separator from './Separator';
import ProviderButton from '../../../../components/ProviderButton';
import {
  ProviderButtonWrapper,
  ProviderLink,
} from '../../../../components/ProviderButton/ProviderButtonStyles';
import { useAuthProviders } from '../../../../hooks';

const Login = loginProps => {
  const { isLoading, data: providers } = useAuthProviders();
  const { formatMessage } = useIntl();

  if (!isLoading && providers.length === 0) {
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
                    <Text fontWeight="bold" fontSize="lg">
                      ...
                    </Text>
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
