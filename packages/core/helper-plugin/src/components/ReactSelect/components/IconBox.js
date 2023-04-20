import styled from 'styled-components';
import { Box } from '@strapi/design-system';

export const IconBox = styled(Box)`
  background: transparent;
  border: none;
  position: relative;
  z-index: 1;

  svg {
    height: ${11 / 16}rem;
    width: ${11 / 16}rem;
  }

  svg path {
    fill: ${({ theme }) => theme.colors.neutral600};
  }
`;

export default IconBox;
