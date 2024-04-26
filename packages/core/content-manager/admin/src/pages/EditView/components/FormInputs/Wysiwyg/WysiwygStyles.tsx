import { BaseButton, IconButton, IconButtonGroup } from '@strapi/design-system';
import styled from 'styled-components';

// NAV BUTTONS
export const CustomIconButton = styled(IconButton)`
  padding: ${({ theme }) => theme.spaces[2]};
  /* Trick to prevent the outline from overflowing because of the general outline-offset */
  outline-offset: -2px !important;

  svg {
    width: 1.8rem;
    height: 1.8rem;
  }
`;

export const CustomLinkIconButton = styled(CustomIconButton)`
  svg {
    width: 0.8rem;
    height: 0.8rem;
  }
`;

export const MainButtons = styled(IconButtonGroup)`
  margin-left: ${({ theme }) => theme.spaces[4]};
`;

export const MoreButton = styled(IconButton)`
  margin: ${({ theme }) => `0 ${theme.spaces[2]}`};
  padding: ${({ theme }) => theme.spaces[2]};

  svg {
    width: 1.8rem;
    height: 1.8rem;
  }
`;

// NAV

export const IconButtonGroupMargin = styled(IconButtonGroup)`
  margin-right: ${({ theme }) => `${theme.spaces[2]}`};
`;

// FOOTER
export const ExpandButton = styled(BaseButton)`
  background-color: transparent;
  border: none;
  align-items: center;

  svg {
    margin-left: ${({ theme }) => `${theme.spaces[2]}`};
    path {
      fill: ${({ theme }) => theme.colors.neutral700};
      width: 1.2rem;
      height: 1.2rem;
    }
  }
`;
