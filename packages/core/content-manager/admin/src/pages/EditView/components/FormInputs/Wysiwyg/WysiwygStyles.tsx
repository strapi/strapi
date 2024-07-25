import { Button, IconButton, IconButtonComponent, IconButtonGroup } from '@strapi/design-system';
import { styled } from 'styled-components';

// NAV BUTTONS
export const CustomIconButton = styled<IconButtonComponent>(IconButton)`
  padding: ${({ theme }) => theme.spaces[2]};

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

export const MoreButton = styled<IconButtonComponent>(IconButton)`
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
export const ExpandButton = styled(Button)`
  background-color: transparent;
  border: none;
  align-items: center;

  & > span {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    font-weight: ${({ theme }) => theme.fontWeights.regular};
  }

  svg {
    margin-left: ${({ theme }) => `${theme.spaces[2]}`};
    path {
      fill: ${({ theme }) => theme.colors.neutral700};
      width: 1.2rem;
      height: 1.2rem;
    }
  }
`;
