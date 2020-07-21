/* eslint-disable indent */
import styled from 'styled-components';
import { Text } from '@buffetjs/core';

import Chevron from '../Chevron';

const activeStyle = theme => `
  color: ${theme.main.colors.mediumBlue};
  ${Text} {
    color: ${theme.main.colors.mediumBlue};
  }
  ${Chevron} {
    display: block;
    color: ${theme.main.colors.mediumBlue};
  }
`;

const RowStyle = styled.div`
  padding-left: ${({ theme }) => theme.main.sizes.paddings.xs};
  width: ${({ level }) => 128 - level * 18}px;
  ${Chevron} {
    width: 13px;
  }
  ${({ isCollapsable, theme }) =>
    isCollapsable &&
    `
    ${Chevron} {
      display: block;
      color: ${theme.main.colors.grey};
    }
    &:hover {
      ${activeStyle(theme)}
    }
  `}
  ${({ isActive, theme }) => isActive && activeStyle(theme)}}
`;

export default RowStyle;
