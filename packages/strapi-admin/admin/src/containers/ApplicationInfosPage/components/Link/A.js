import styled from 'styled-components';
import { Text } from '@buffetjs/core';
import { Arrow } from '@buffetjs/icons';

const A = styled(Text)`
  color: ${({ theme }) => theme.main.colors.mediumBlue};
  > a {
    &:hover {
      color: ${({ theme }) => theme.main.colors.mediumBlue};
      text-decoration: none;
    }
  }
`;

// TODO delete when notif ready
export const LinkArrow = styled(Arrow)`
  transform: rotate(45deg);
  margin-top: 2px;
  margin-left: 10px;
  color: ${({ theme }) => theme.main.colors.blue};
`;

export default A;
