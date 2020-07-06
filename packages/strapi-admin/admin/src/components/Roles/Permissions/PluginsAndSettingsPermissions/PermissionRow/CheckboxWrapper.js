/* eslint-disable indent */
import styled from 'styled-components';

const CheckboxWrapper = styled.div`
  min-width: 33%;
  padding: 0.9rem;
  height: 3.6rem;
  position: relative;
  ${({ hasConditions, disabled, theme }) =>
    hasConditions &&
    `
    &:before {
      content: '•';
      position: absolute;
      top: 2px;
      left: 0px;
      color: ${disabled ? theme.main.colors.grey : theme.main.colors.mediumBlue};
    }
  `}
`;

export default CheckboxWrapper;
