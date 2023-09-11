import { Typography } from '@strapi/design-system';
import styled, { css } from 'styled-components';

export const H1 = styled(Typography).attrs({ as: 'h1' })`
  font-size: ${42 / 16}rem;
  line-height: ${({ theme }) => theme.lineHeights[1]};
`;

export const H2 = styled(Typography).attrs({ as: 'h2' })`
  font-size: ${35 / 16}rem;
  line-height: ${({ theme }) => theme.lineHeights[1]};
`;

export const H3 = styled(Typography).attrs({ as: 'h3' })`
  font-size: ${29 / 16}rem;
  line-height: ${({ theme }) => theme.lineHeights[1]};
`;

export const H4 = styled(Typography).attrs({ as: 'h4' })`
  font-size: ${24 / 16}rem;
  line-height: ${({ theme }) => theme.lineHeights[1]};
`;

export const H5 = styled(Typography).attrs({ as: 'h5' })`
  font-size: ${20 / 16}rem;
  line-height: ${({ theme }) => theme.lineHeights[1]};
`;

export const H6 = styled(Typography).attrs({ as: 'h6' })`
  font-size: 1rem;
  line-height: ${({ theme }) => theme.lineHeights[1]};
`;

export const Italic = styled(Typography)`
  font-style: italic;
`;

export const Img = styled.img`
  max-width: 100%;
`;

export const InlineCode = styled.code`
  background-color: ${({ theme }) => theme.colors.neutral150};
  border-radius: ${({ theme }) => theme.borderRadius};
  padding: ${({ theme }) => `0 ${theme.spaces[2]}`};
  font-family: 'SF Mono', SFMono-Regular, ui-monospace, 'DejaVu Sans Mono', Menlo, Consolas,
    monospace;
`;

export const CodeBlock = styled.pre`
  border-radius: ${({ theme }) => theme.borderRadius};
  background-color: #32324d; // since the color is same between the themes
  max-width: 100%;
  overflow: auto;
  padding: ${({ theme }) => theme.spaces[2]};

  & > code {
    color: #839496; // TODO: to confirm with design and get theme color
    overflow: auto;
    max-width: 100%;
    padding: ${({ theme }) => theme.spaces[2]};
  }
`;

export const Blockquote = styled.blockquote`
  margin: ${({ theme }) => `${theme.spaces[6]} 0`};
  font-size: ${14 / 16}rem;
  font-weight: ${({ theme }) => theme.fontWeights.regular};
  border-left: 4px solid ${({ theme }) => theme.colors.neutral150};
  font-style: italic;
  padding: ${({ theme }) => theme.spaces[2]} ${({ theme }) => theme.spaces[5]};
`;

const listStyle = css`
  margin-block-start: ${({ theme }) => theme.spaces[4]};
  margin-block-end: ${({ theme }) => theme.spaces[4]};
  margin-inline-start: ${({ theme }) => theme.spaces[0]};
  margin-inline-end: ${({ theme }) => theme.spaces[0]};
  padding-inline-start: ${({ theme }) => theme.spaces[4]};

  ol,
  ul {
    margin-block-start: ${({ theme }) => theme.spaces[0]};
    margin-block-end: ${({ theme }) => theme.spaces[0]};
  }
`;

export const Orderedlist = styled.ol`
  list-style-type: decimal;
  ${listStyle}
`;

export const Unorderedlist = styled.ul`
  list-style-type: disc;
  ${listStyle}
`;
