import React from 'react';
import styled from 'styled-components';
import { Box } from '@strapi/parts/Box';
import { Row } from '@strapi/parts/Row';

const StyledBox = styled(Box)`
  width: ${({ theme }) => theme.spaces[2]};
  height: ${({ theme }) => theme.spaces[4]};
`;

const Rectangle = () => {
  return (
    <Row justifyContent="center">
      <StyledBox background="primary200" />
    </Row>
  );
};

export default Rectangle;
