import styled from 'styled-components';
import { GridItem } from '@strapi/design-system/Grid';
import { Stack } from '@strapi/design-system/Stack';

// 56px * 3 = height of header + top & bottom padding of main container
// 24px = vertical space between FormApiTokenContainer & Permissions
export const CalculatedHeightStack = styled(Stack)`
  height: calc(100vh - 56px * 3 - 24px);
`;

// 56px: height of header
export const StickyGridItem = styled(GridItem)`
  position: sticky;
  top: 56px;
  height: calc(100vh - 56px);
`;
