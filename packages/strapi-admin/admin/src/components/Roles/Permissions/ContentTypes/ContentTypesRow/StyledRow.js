import styled from 'styled-components';
import { Text } from '@buffetjs/core';
import Chevron from './Chevron';

const StyledRow = styled.div`
  display: flex;
  align-items: center;
  height: 36px;
  background-color: ${({ isGrey, theme }) =>
    isGrey ? theme.main.colors.content.background : theme.main.colors.white};
  border: 1px solid transparent;
  ${({ isActive, theme }) =>
      isActive &&
    `
    border: 1px solid ${theme.main.colors.darkBlue};
    background-color: ${theme.main.colors.lightBlue};
    color: ${theme.main.colors.mediumBlue};
    ${Text} {
      color: ${theme.main.colors.mediumBlue};
    }
    ${Chevron} {
      display: block;
    }
  `}
  &:hover {
    border: 1px solid ${({ theme }) => theme.main.colors.darkBlue};
    background-color: ${({ theme }) => theme.main.colors.lightBlue};
    color: ${({ theme }) => theme.main.colors.mediumBlue};
    ${Text} {
      color: ${({ theme }) => theme.main.colors.mediumBlue};
    }
    ${Chevron} {
      display: block;
    }
  }
`;

export default StyledRow;
