import React from 'react';
import { Text, Padded } from '@buffetjs/core';
import { useHistory } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { BaselineAlignment, useQuery } from 'strapi-helper-plugin';
import Button from '../../../../components/FullWidthButton';
import OopsLogo from '../../../../assets/images/oops.png';
import Box from '../Box';
import Logo from '../Logo';
import Section from '../Section';
import Img from './Img';

const Oops = () => {
  const { push } = useHistory();
  const { formatMessage } = useIntl();
  const query = useQuery();

  const handleClick = () => {
    push('/auth/login');
  };

  const message = query.get('info') || formatMessage({ id: 'Auth.components.Oops.text' });

  return (
    <>
      <Section textAlign="center">
        <Logo />
      </Section>
      <Section withBackground textAlign="center">
        <BaselineAlignment top size="25px">
          <Box withoutError>
            <Padded top>
              <Padded top size="xs">
                <Img src={OopsLogo} alt="oops" />
              </Padded>
            </Padded>
            {/* FIXME IN BUFFET.JS */}
            <BaselineAlignment top size="20px">
              <Padded top size="xs">
                <Text fontSize="xl" fontWeight="bold">
                  Oops...
                </Text>
              </Padded>
            </BaselineAlignment>
            <Padded top size="xs">
              <Padded top size="sm">
                <BaselineAlignment top size="3px" />
                <Text fontSize="md">{message}</Text>
              </Padded>
            </Padded>
            <Padded top size="md">
              <Button type="button" color="primary" textTransform="uppercase" onClick={handleClick}>
                {formatMessage({ id: 'Auth.link.signin' })}
              </Button>
            </Padded>
          </Box>
        </BaselineAlignment>
      </Section>
    </>
  );
};

export default Oops;
