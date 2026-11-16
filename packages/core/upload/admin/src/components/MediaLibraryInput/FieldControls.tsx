import { IconButton, Menu } from '@strapi/design-system';
import { styled } from 'styled-components';

/**
 * A ghost `IconButton` that stays a bare icon when disabled. The design system
 * paints every disabled button, ghost included, as a bordered grey plate.
 */
export const GhostIconButton = styled(IconButton).attrs({ variant: 'ghost' })`
  &&[aria-disabled='true'] {
    border-color: transparent;
    background: transparent;
  }

  &&[aria-disabled='true'] svg path {
    fill: ${({ theme }) => theme.colors.neutral300};
  }
`;

/**
 * A `Menu.Item` whose label greys out with its icon when disabled. The design
 * system computes a disabled text colour, then its own stylesheet overrides it.
 */
export const FieldMenuItem = styled(Menu.Item)`
  &&[aria-disabled='true'] {
    color: ${({ theme }) => theme.colors.neutral500};
  }
`;
