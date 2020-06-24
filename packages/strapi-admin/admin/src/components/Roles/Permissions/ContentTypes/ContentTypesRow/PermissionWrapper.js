import styled from 'styled-components';
import { Flex } from '@buffetjs/core';

const PermissionWrapper = styled(Flex)`
  flex: 1;
  ${({ isDisabled, theme }) =>
  isDisabled &&
    `
      input[type='checkbox'] {
        &:after {
          color: ${theme.main.colors.grey};
        }
        cursor: pointer;
      }
  `}
`;

export default PermissionWrapper;
