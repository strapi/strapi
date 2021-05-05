/* eslint-disable indent */
import styled from 'styled-components';
import { Flex } from '@buffetjs/core';
import { activeStyle } from '../../utils';
import Chevron from '../../../Chevron';

const RowWrapper = styled(Flex)`
  height: 36px;
  padding: 1rem 0;
  flex: 1;
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
  ${({ isActive, theme }) => isActive && activeStyle(theme)};
`;

export default RowWrapper;
