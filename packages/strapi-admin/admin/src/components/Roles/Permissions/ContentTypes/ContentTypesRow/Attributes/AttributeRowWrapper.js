/* eslint-disable indent */
import styled from 'styled-components';
import { Flex } from '@buffetjs/core';

import Chevron from '../Chevron';

const AttributeRowWrapper = styled(Flex)`
  padding: 1rem 0;
  flex: 1;
  height: 36px;
  ${({ isCollapsable }) =>
    isCollapsable &&
    `
  &:hover {
    ${Chevron} {
      display: block;
    }
  }
  `}
`;

export default AttributeRowWrapper;
