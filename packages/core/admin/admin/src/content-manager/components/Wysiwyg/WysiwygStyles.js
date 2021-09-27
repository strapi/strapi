import styled from 'styled-components';
import { Box } from '@strapi/parts/Box';
import { IconButtonGroup, IconButton } from '@strapi/parts/IconButton';
import { BaseButton } from '@strapi/parts/BaseButton';

export const WysiwygWrapper = styled(Box)`
  border: 1px solid
    ${({ theme, error }) => (error ? theme.colors.danger600 : theme.colors.neutral200)};
  margin-top: ${({ theme }) => `${theme.spaces[2]}`};
`;

// NAV BUTTONS
export const CustomIconButton = styled(IconButton)`
  padding: ${({ theme }) => theme.spaces[2]};
  /* Trick to prevent the outline from overflowing because of the general outline-offset */
  outline-offset: -2px !important;

  svg {
    width: ${18 / 16}rem;
    height: ${18 / 16}rem;
  }
`;

export const MainButtons = styled(IconButtonGroup)`
  margin-left: ${({ theme }) => theme.spaces[4]};
`;

export const MoreButton = styled(IconButton)`
  margin: ${({ theme }) => `0 ${theme.spaces[2]}`};
  padding: ${({ theme }) => theme.spaces[2]};

  svg {
    width: ${18 / 16}rem;
    height: ${18 / 16}rem;
  }
`;

// NAV

export const IconButtonGroupMargin = styled(IconButtonGroup)`
  margin-right: ${({ theme }) => `${theme.spaces[2]}`};
`;

// EDITOR && PREVIEW

export const EditorAndPreviewWrapper = styled.div`
  position: relative;
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
      width: ${12 / 16}rem;
      height: ${12 / 16}rem;
    }
  }
`;

// PREVIEW

const setOpacity = (hex, alpha) =>
  `${hex}${Math.floor(alpha * 255)
    .toString(16)
    .padStart(2, 0)}`;

export const ExpandWrapper = styled.div`
  position: absolute;
  z-index: 4;
  inset: 0;
  background: ${({ theme }) => setOpacity(theme.colors.neutral800, 0.2)};
  padding: 0 ${({ theme }) => theme.spaces[8]};
`;

export const ExpandContainer = styled(Box)`
  display: flex;
  max-width: ${1080 / 16}rem;
  min-height: ${500 / 16}rem;
  margin: 0 auto;
  overflow: hidden;
  margin-top: 10%;
  border: ${({ theme }) => `1px solid ${theme.colors.neutral200}`};
`;

export const PreviewWrapper = styled(Box)`
  width: 50%;
  border-left: ${({ theme }) => `1px solid ${theme.colors.neutral200}`};
`;

export const WysiwygContainer = styled(Box)`
  width: 50%;
`;

export const PreviewHeader = styled(Box)`
  border-radius: 0 0 4px 4px;
  border-top: 0;
`;

export const PreviewContainer = styled(Box)`
  position: relative;
  height: 100%;
`;
