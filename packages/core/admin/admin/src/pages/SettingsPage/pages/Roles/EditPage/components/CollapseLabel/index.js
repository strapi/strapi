import styled from 'styled-components';
import { Row } from '@strapi/parts/Row';

const CollapseLabel = styled(Row)`
  padding-right: ${({ theme }) => theme.spaces[2]};
  overflow: hidden;
  flex: 1;
  ${({ isCollapsable }) => isCollapsable && 'cursor: pointer;'}
`;

export default CollapseLabel;
