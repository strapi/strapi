import React from 'react';
import { Text } from '@buffetjs/core';
import Wrapper from './Wrapper';

const Option = () => {
  return (
    <Wrapper left right size="xs">
      <Text color="mediumBlue" lineHeight="23px">
        Community Edition
      </Text>
    </Wrapper>
  );
};

export default Option;
