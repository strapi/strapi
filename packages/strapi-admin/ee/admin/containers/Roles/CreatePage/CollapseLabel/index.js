import styled from 'styled-components';
import { Flex } from '@buffetjs/core';

const CollapseLabel = styled(Flex)`
  padding-right: 10px;
  overflow: hidden;
  flex: 1;
  ${({ isCollapsable }) => isCollapsable && 'cursor: pointer;'}
`;

export default CollapseLabel;
