import React from 'react';
import { Text } from '@buffetjs/core';
import { useIntl } from 'react-intl';
import BaselineAlignment from '../../../../components/BaselineAlignement';
import AuthLink from '../AuthLink';
import Logo from '../Logo';
import Section from '../Section';
import Box from '../Box';

const ForgotPasswordSuccess = () => {
  const { formatMessage } = useIntl();

  return (
    <>
      <Section textAlign="center">
        <Logo />
      </Section>
      <Section withBackground>
        <BaselineAlignment top size="25px">
          <Box borderColor="#5a9e06">
            <Text fontSize="md" color="#5a9e06" style={{ textAlign: 'center' }} lineHeight="18px">
              {formatMessage({ id: 'app.containers.AuthPage.ForgotPasswordSuccess.text' })}
            </Text>
            <BaselineAlignment bottom size="7px" />
          </Box>
        </BaselineAlignment>
        <AuthLink label="Auth.link.ready" to="/auth/login" />
      </Section>
    </>
  );
};

export default ForgotPasswordSuccess;
