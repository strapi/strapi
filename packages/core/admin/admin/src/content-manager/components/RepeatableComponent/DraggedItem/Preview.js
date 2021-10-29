import React from 'react';
import styled from 'styled-components';
import { Box } from '@strapi/design-system/Box';

const StyledBox = styled(Box)`
  outline: 1px dashed ${({ theme }) => theme.colors.primary500};
  outline-offset: -1px;
`;

const Preview = () => {
  return <StyledBox padding={6} background="primary100" />;
};

export default Preview;
