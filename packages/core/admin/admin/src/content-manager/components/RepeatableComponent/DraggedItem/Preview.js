import React from 'react';
import styled from 'styled-components';
import { Box } from '@strapi/parts/Box';
import { Row } from '@strapi/parts/Row';

const StyledBox = styled(Box)`
  border: 1px dashed ${({ theme }) => theme.colors.primary500};
`;

const Preview = () => {
  return (
    <StyledBox padding={8} background="primary100">
      <Box>
        <Row />
      </Box>
    </StyledBox>
  );
};

export default Preview;
