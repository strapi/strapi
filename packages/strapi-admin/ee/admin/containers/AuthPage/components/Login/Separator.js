import React from 'react';
import styled from 'styled-components';
import { Flex, Padded, Text } from '@buffetjs/core';

const BorderTop = styled.div`
  border-top: 1px solid lightgrey;
  width: 100%;
`;

const Separator = () => {
  return (
    <Flex justifyContent="center" alignItems="center">
      <BorderTop />
      <Padded left right size="sm">
        <Text color="grey">OR</Text>
      </Padded>
      <BorderTop />
    </Flex>
  );
};

export default Separator;
