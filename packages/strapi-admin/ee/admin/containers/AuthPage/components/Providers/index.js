import { Button, Text } from '@buffetjs/core';
import React from 'react';
import { useHistory } from 'react-router-dom';
import BaselineAlignment from '../../../../../../admin/src/components/BaselineAlignement';
import Box from '../../../../../../admin/src/containers/AuthPage/components/Box';
import Logo from '../../../../../../admin/src/containers/AuthPage/components/Logo';
import Section from '../../../../../../admin/src/containers/AuthPage/components/Section';

const Providers = () => {
  const { push } = useHistory();
  // const { isLoading, providers } = useAuthProviders();

  const handleClick = () => {
    push('/auth/login');
  };

  return (
    <>
      <Section textAlign="center">
        <Logo />
      </Section>
      <Section withBackground textAlign="center">
        <BaselineAlignment top size="25px">
          <Box withoutError>
            <Text>All auth providers</Text>
            <Button onClick={handleClick}>LOG IN VIA STRAPI</Button>
          </Box>
        </BaselineAlignment>
      </Section>
    </>
  );
};

export default Providers;
