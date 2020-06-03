import styled from 'styled-components';
import { Text } from '@buffetjs/core';
import Chevron from './Chevron';

const activeRowStyle = theme => `
  border: 1px solid ${theme.main.colors.darkBlue};
  background-color: ${theme.main.colors.lightBlue};
  color: ${theme.main.colors.mediumBlue};
  ${Text} {
    color: ${theme.main.colors.mediumBlue};
  }
  ${Chevron} {
    display: block;
  }
`;

const StyledRow = styled.div`
  display: flex;
  align-items: center;
  height: 36px;
  background-color: ${({ isGrey, theme }) =>
    isGrey ? theme.main.colors.content.background : theme.main.colors.white};
  border: 1px solid transparent;
  ${({ isActive, theme }) => isActive && activeRowStyle(theme)}
  &:hover {
    ${({ theme }) => activeRowStyle(theme)}
  }
`;

export default StyledRow;
