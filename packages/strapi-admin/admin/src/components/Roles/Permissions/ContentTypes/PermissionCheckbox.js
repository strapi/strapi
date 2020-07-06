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
      position: absolute;
      top: -9px;
      left: -8px;
      color: ${disabled ? theme.main.colors.grey : theme.main.colors.mediumBlue};
    }
  `}
  ${({ disabled, theme }) =>
    disabled &&
    `
    input[type='checkbox'] {
        &:after {
          cursor: default;
          color: ${theme.main.colors.grey};
        }
      }
    `}
`;

export default PermissionCheckbox;
