/* eslint-disable indent */
import styled from 'styled-components';
import { Checkbox } from '@buffetjs/core';

const PermissionCheckbox = styled(Checkbox)`
  min-width: 10rem;
  max-width: 12rem;
  flex: 1;
  position: relative;
  ${({ hasConditions, theme }) =>
    hasConditions &&
    `
    &:before {
      content: '•';
      position: absolute;
      top: -9px;
      left: -8px;
      color: ${theme.main.colors.mediumBlue};
    }
  `}
  ${({ disabled, theme }) =>
    disabled &&
    `
    input[type='checkbox'] {
        &:after {
          color: ${theme.main.colors.grey};
        }
      }
    `}
`;

export default PermissionCheckbox;
