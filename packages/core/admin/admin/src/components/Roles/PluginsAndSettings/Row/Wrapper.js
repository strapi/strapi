import styled from 'styled-components';
import { Text } from '@buffetjs/core';

const activeStyle = theme => `
    background-color: ${theme.main.colors.lightestBlue};
    border: 1px solid ${theme.main.colors.darkBlue};
    ${Text} {
      color: ${theme.main.colors.mediumBlue};
    }
    svg {
      color: ${theme.main.colors.mediumBlue};
    }
`;

const RowStyle = styled.div`
  height: 5.4rem;
  padding: 1rem 3rem;
  border: 1px solid transparent;
  background-color: ${({ theme, isWhite }) => theme.main.colors[isWhite ? 'white' : 'lightGrey']};
  cursor: pointer;
  &:hover {
    background-color: ${({ theme }) => theme.main.colors.lightestBlue};
    ${({ theme }) => activeStyle(theme)};
  }
  ${({ isActive, theme }) => isActive && activeStyle(theme)};
`;

export default RowStyle;
