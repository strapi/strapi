/* eslint-disable indent */
import styled from 'styled-components';
import { Flex, Text } from '@buffetjs/core';

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

const AttributeRowWrapper = styled(Flex)`
  height: 36px;
  padding: 1rem 0;
  flex: 1;
  ${Chevron} {
    width: 13px;
  }
  ${({ isRequired, theme }) =>
    isRequired &&
    `
      ${Text}:after {
        content: '*';
        padding-left: 1px;
        color: ${theme.main.colors.red};
      }
  `}
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

export default AttributeRowWrapper;
