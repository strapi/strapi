import React from 'react';
import { Button, Text } from '@buffetjs/core';
import { useHistory } from 'react-router-dom';
import { useIntl } from 'react-intl';
import BaselineAlignment from '../../../../components/BaselineAlignement';
import Logo from '../Logo';
import Section from '../Section';

const Oops = () => {
  const { push } = useHistory();
  const { formatMessage } = useIntl();
  const handleClick = () => {
    push('/auth/login');
  };

  // TODO add logo when available
  // This component is temporary

  return (
    <>
      <Section textAlign="center">
        <Logo />
      </Section>
      <Section withBackground textAlign="center">
        <BaselineAlignment top size="168px">
          <Text fontSize="lg" fontWeight="bold">
            Oops...
          </Text>
        </BaselineAlignment>
        <BaselineAlignment top size="18px">
          <Text fontSize="md">{formatMessage({ id: 'Auth.components.Oops.text' })}</Text>
        </BaselineAlignment>
        <BaselineAlignment top size="50px">
          <Button onClick={handleClick} type="button">
            {formatMessage({ id: 'Auth.form.button.go-home' })}
          </Button>
        </BaselineAlignment>
      </Section>
    </>
  );
};

export default Oops;
