import React from 'react';
import styled from 'styled-components';
import { Box } from '@strapi/parts/Box';
import { Flex } from '@strapi/parts/Flex';

const StyledBox = styled(Box)`
  width: ${({ theme }) => theme.spaces[2]};
  height: ${({ theme }) => theme.spaces[4]};
`;

const Rectangle = () => {
  return (
    <Flex justifyContent="center">
      <StyledBox background="primary200" />
    </Flex>
  );
};

export default Rectangle;
