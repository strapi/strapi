import styled from 'styled-components';
import { Flex } from '@buffetjs/core';

const PermissionWrapper = styled(Flex)`
  flex: 1;
  ${({ disabled, theme }) =>
    `
      input[type='checkbox'] {
        &:after {
          color: ${disabled ? theme.main.colors.grey : theme.main.colors.mediumBlue};
        }
        cursor: pointer;
      }
  `}
`;

export default PermissionWrapper;
