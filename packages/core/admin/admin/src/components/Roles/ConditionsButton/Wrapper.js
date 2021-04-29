/* eslint-disable indent */
import styled from 'styled-components';

const Wrapper = styled.div`
  position: relative;
  cursor: pointer;
  color: ${({ theme }) => theme.main.colors.mediumBlue};
  ${({ isRight }) =>
    isRight &&
    `
    position: absolute;
    right: 5rem;
  `}
  ${({ hasConditions, disabled, theme }) =>
    hasConditions &&
    `
    &:before {
      content: '•';
      position: absolute;
      top: -4px;
      left: -15px;
      font-size: 18px;
      color: ${disabled ? theme.main.colors.grey : theme.main.colors.mediumBlue};
    }
  `}
`;

export default Wrapper;
