import styled from 'styled-components';
import { Text } from '@buffetjs/core';
import ConditionsButton from '../../ConditionsButton';
import Chevron from '../../Chevron';

const activeRowStyle = (theme, isActive) => `
  border: 1px solid ${theme.main.colors.darkBlue};
  background-color: ${theme.main.colors.lightBlue};
  color: ${theme.main.colors.mediumBlue};
  border-radius: ${isActive ? '2px 2px 0 0' : '2px'};
  ${Text} {
    color: ${theme.main.colors.mediumBlue};
  }
  ${Chevron} {
    display: block;
  }
  ${ConditionsButton} {
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
  ${ConditionsButton} {
    display: none;
  }
  ${({ isActive, theme }) => isActive && activeRowStyle(theme, isActive)}
  &:hover {
    ${({ theme, isActive }) => activeRowStyle(theme, isActive)}
  }
`;

export default StyledRow;
