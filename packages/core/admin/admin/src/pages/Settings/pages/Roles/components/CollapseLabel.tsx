import { Flex, FlexComponent } from '@strapi/design-system';
import { styled } from 'styled-components';

const CollapseLabel = styled<FlexComponent>(Flex)<{ $isCollapsable: boolean }>`
  padding-right: ${({ theme }) => theme.spaces[2]};
  overflow: hidden;
  flex: 1;
  ${({ $isCollapsable }) => $isCollapsable && 'cursor: pointer;'}
`;

export { CollapseLabel };
