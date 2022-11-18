import styled from 'styled-components';
import { Flex } from '@strapi/design-system';

const CollapseLabel = styled(Flex)`
  padding-right: ${({ theme }) => theme.spaces[2]};
  overflow: hidden;
  flex: 1;
  ${({ isCollapsable }) => isCollapsable && 'cursor: pointer;'}
`;

export default CollapseLabel;
