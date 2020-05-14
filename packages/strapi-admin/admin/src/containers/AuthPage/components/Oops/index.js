import React from 'react';
import { Button, Padded, Text } from '@buffetjs/core';
import { useHistory } from 'react-router-dom';
import { useIntl } from 'react-intl';
import Logo from '../Logo';
import Section from '../Section';

const Oops = () => {
  const { push } = useHistory();
  const { formatMessage } = useIntl();
  const handleClick = () => {
    push('/auth/login');
  };

  // TODO add logo when available

  return (
    <>
      <Section textAlign="center">
        <Logo />
      </Section>
      <Section withBackground textAlign="center">
        <Padded top size="168px">
          <Text fontSize="lg" fontWeight="bold">
            Oops...
          </Text>
        </Padded>
        <Padded top size="18px">
          <Text fontSize="md">{formatMessage({ id: 'Auth.components.Oops.text' })}</Text>
        </Padded>
        <Padded top size="50px">
          <Button onClick={handleClick} type="button">
            {formatMessage({ id: 'Auth.form.button.go-home' })}
          </Button>
        </Padded>
      </Section>
    </>
  );
};

export default Oops;
