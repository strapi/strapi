/* eslint-disable indent */
import styled from 'styled-components';
import { Checkbox } from '@buffetjs/core';

const PermissionCheckbox = styled(Checkbox)`
  min-width: 10rem;
  max-width: 12rem;
  flex: 1;
  position: relative;
  input[type='checkbox'] {
    z-index: 10;
    &:after {
      color: ${({ theme }) => theme.main.colors.mediumBlue};
    }
  }
  ${({ hasConditions, disabled, theme }) =>
    hasConditions &&
    `
    &:before {
      content: '•';
      font-size: 11px;
      position: absolute;
      top: -6px;
      left: -7px;
      color: ${disabled ? theme.main.colors.grey : theme.main.colors.mediumBlue};
    }
  `}
  ${({ disabled, theme }) =>
    disabled &&
    `
    input[type='checkbox'] {
      cursor: not-allowed;
        &:after {
          color: ${theme.main.colors.grey};
        }
      }
    `}
`;

export default PermissionCheckbox;
