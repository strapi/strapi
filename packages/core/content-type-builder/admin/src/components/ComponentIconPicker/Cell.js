import styled from 'styled-components';
import { Flex } from '@strapi/design-system/Flex';

const Cell = styled(Flex)`
  svg {
    z-index: 2;
    color: ${({ isSelected, theme }) =>
      isSelected ? theme.colors.primary600 : theme.colors.neutral300};
  }
  ${({ isSelected, theme }) => {
    if (isSelected) {
      return `
      &::after {
        content: '';
        position: absolute;
        top: 8px;
        left: 8px;
        border-radius: 50%;
        width: 28px;
        height: 28px;
        background-color: ${theme.colors.primary200};
        z-index: 1;
      }
    `;
    }

    return '';
  }}
`;

export default Cell;
