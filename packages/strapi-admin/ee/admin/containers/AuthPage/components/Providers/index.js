import React from 'react';
import { Button, Flex, Padded, Separator } from '@buffetjs/core';
import { LoadingIndicator } from '@buffetjs/styles';
import { Redirect, useHistory } from 'react-router-dom';
import styled from 'styled-components';
import { useIntl } from 'react-intl';
import { BaselineAlignment } from 'strapi-helper-plugin';

import Box from '../../../../../../admin/src/containers/AuthPage/components/Box';
import Logo from '../../../../../../admin/src/containers/AuthPage/components/Logo';
import Section from '../../../../../../admin/src/containers/AuthPage/components/Section';
import ProviderButton from '../../../../components/ProviderButton';
import { useAuthProviders } from '../../../../hooks';

const ProviderWrapper = styled.div`
  padding: 5px 4px;
`;

const Providers = () => {
  const ssoEnabled = ENABLED_EE_FEATURES.includes('sso');

  const { push } = useHistory();
  const { formatMessage } = useIntl();
  const { isLoading, data: providers } = useAuthProviders({ ssoEnabled });

  const handleClick = () => {
    push('/auth/login');
  };

  if (!ssoEnabled || (!isLoading && providers.length === 0)) {
    return <Redirect to="/auth/login" />;
  }

  return (
    <>
      <Section textAlign="center">
        <Logo />
      </Section>
      <Section withBackground textAlign="center">
        <BaselineAlignment top size="25px">
          <Box withoutError>
            {isLoading ? (
              <LoadingIndicator />
            ) : (
              <Flex flexWrap="wrap">
                {providers.map(provider => (
                  <ProviderWrapper key={provider.uid}>
                    <ProviderButton provider={provider} />
                  </ProviderWrapper>
                ))}
              </Flex>
            )}
            <Padded top bottom size="smd">
              <BaselineAlignment top size="3px" />
              <Separator
                label={formatMessage({
                  id: 'or',
                  defaultMessage: 'OR',
                })}
              />
              <BaselineAlignment top size="7px" />
            </Padded>
            <Button style={{ width: '100%' }} onClick={handleClick} type="submit" color="secondary">
              {formatMessage({
                id: 'Auth.form.button.login.strapi',
                defaultMessage: 'LOG IN VIA STRAPI',
              })}
            </Button>
          </Box>
        </BaselineAlignment>
      </Section>
    </>
  );
};

export default Providers;
