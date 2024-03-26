import { Flex } from '@strapi/design-system';
import styled from 'styled-components';

const CollapseLabel = styled(Flex)<{ isCollapsable: boolean }>`
  padding-right: ${({ theme }) => theme.spaces[2]};
  overflow: hidden;
  flex: 1;
  ${({ isCollapsable }) => isCollapsable && 'cursor: pointer;'}
`;

export { CollapseLabel };
