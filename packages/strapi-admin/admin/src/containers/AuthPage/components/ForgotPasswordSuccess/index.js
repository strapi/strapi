import React from 'react';
import { Padded, Text } from '@buffetjs/core';
import { useIntl } from 'react-intl';
import { useHistory } from 'react-router-dom';
import BaselineAlignment from '../../../../components/BaselineAlignement';
import Button from '../../../../components/FullWidthButton';

import Box from '../Box';
import Logo from '../Logo';
import Section from '../Section';
import IconWrapper from './IconWrapper';

const ForgotPasswordSuccess = () => {
  const { formatMessage } = useIntl();
  const { push } = useHistory();

  const handleClick = () => {
    push('/auth/login');
  };

  return (
    <>
      <Section textAlign="center">
        <Logo />
      </Section>
      <Section withBackground>
        <BaselineAlignment top size="20px">
          <Padded top size="xs">
            <Box withoutError>
              <Padded top>
                <Padded top size="xs">
                  <IconWrapper>todo</IconWrapper>
                </Padded>
              </Padded>
              <BaselineAlignment top size="16px">
                <Text fontSize="md" style={{ textAlign: 'center' }} lineHeight="18px">
                  {formatMessage({
                    id: 'app.containers.AuthPage.ForgotPasswordSuccess.text.email',
                  })}
                </Text>
                <Padded top>
                  <BaselineAlignment top size="7px">
                    <Text fontSize="md" style={{ textAlign: 'center' }} lineHeight="18px">
                      {formatMessage({
                        id: 'app.containers.AuthPage.ForgotPasswordSuccess.text.contact-admin',
                      })}
                    </Text>
                  </BaselineAlignment>
                </Padded>
              </BaselineAlignment>
              <Padded top size="md">
                <Button
                  type="button"
                  color="primary"
                  textTransform="uppercase"
                  onClick={handleClick}
                >
                  {formatMessage({ id: 'Auth.link.signin' })}
                </Button>
              </Padded>
            </Box>
          </Padded>
        </BaselineAlignment>
      </Section>
    </>
  );
};

export default ForgotPasswordSuccess;
