import React from 'react';
import { Padded, Text } from '@buffetjs/core';
import { useIntl } from 'react-intl';
import { useHistory } from 'react-router-dom';
import BaselineAlignment from '../../../../components/BaselineAlignement';
import Button from '../../../../components/FullWidthButton';
import Box from '../Box';
import Logo from '../Logo';
import Section from '../Section';
import Envelope from './Envelope';
import CustomText from './Text';

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
      <Section withBackground textAlign="center">
        {/* FIXME IN BUFFET.JS */}
        <BaselineAlignment top size="20px">
          <Padded top size="xs">
            <Box withoutError>
              <BaselineAlignment top size="3px">
                <Envelope />
              </BaselineAlignment>
              {/* FIXME IN BUFFET.JS */}
              <BaselineAlignment top size="20px">
                <CustomText fontWeight="bold" lineHeight="24px">
                  {formatMessage({ id: 'app.containers.AuthPage.ForgotPasswordSuccess.title' })}
                </CustomText>
              </BaselineAlignment>
              {/* FIXME IN BUFFET.JS */}
              <BaselineAlignment top size="20px">
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
