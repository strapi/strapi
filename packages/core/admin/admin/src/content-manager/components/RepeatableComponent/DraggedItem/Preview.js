import React from 'react';
import styled from 'styled-components';
import { Box } from '@strapi/parts/Box';
import { Flex } from '@strapi/parts/Flex';

const StyledBox = styled(Box)`
  border: 1px dashed ${({ theme }) => theme.colors.primary500};
`;

const Preview = () => {
  return (
    <StyledBox padding={8} background="primary100">
      <Box>
        <Flex />
      </Box>
    </StyledBox>
  );
};

export default Preview;
