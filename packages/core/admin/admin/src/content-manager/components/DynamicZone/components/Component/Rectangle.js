import React from 'react';
import styled from 'styled-components';
import { Box } from '@strapi/design-system/Box';
import { Flex } from '@strapi/design-system/Flex';

const StyledBox = styled(Box)`
  width: ${({ theme }) => theme.spaces[2]};
  height: ${({ theme }) => theme.spaces[4]};
`;

const Rectangle = () => {
  return (
    <Flex justifyContent="center">
      <StyledBox background="neutral200" />
    </Flex>
  );
};

export default Rectangle;
