import React from 'react';
import { Button, Text } from '@buffetjs/core';
import { useHistory } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { useQuery } from 'strapi-helper-plugin';
import BaselineAlignment from '../../../../components/BaselineAlignement';
import OopsLogo from '../../../../assets/images/oops.png';
import Logo from '../Logo';
import Section from '../Section';
import Img from './Img';
import CustomText from './Text';

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
        <BaselineAlignment top size="60px">
          <Img src={OopsLogo} />
          <BaselineAlignment top size="26px">
            <CustomText fontWeight="bold">Oops...</CustomText>
          </BaselineAlignment>
        </BaselineAlignment>
        <BaselineAlignment top size="14px">
          <Text fontSize="lg">{message}</Text>
        </BaselineAlignment>
        <BaselineAlignment top size="48px">
          <Button onClick={handleClick} type="button">
            {formatMessage({ id: 'Auth.form.button.go-home' })}
          </Button>
        </BaselineAlignment>
      </Section>
    </>
  );
};

export default Oops;
