import styled from 'styled-components';

const Wrapper = styled.div`
  width: 100%;
  max-height: 512px;
  overflow: auto;
  padding: ${({ theme }) => `${theme.spaces[3]} ${theme.spaces[4]}`};
  font-size: ${14 / 16}rem;
  background-color: ${({ theme }) => theme.colors.neutral0};
  color: ${({ theme }) => theme.colors.neutral800};
  line-height: ${({ theme }) => theme.lineHeights[6]};
  border-radius: ${({ theme }) => theme.borderRadius};

  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    margin-block-start: ${({ theme }) => theme.spaces[2]};
    margin-block-end: ${({ theme }) => theme.spaces[2]};
  }

  p {
    margin-bottom: ${({ theme }) => theme.spaces[2]};
  }

  /* 14px body text multiplied by 1.2 for each heading */

  h1 {
    font-size: ${48 / 16}rem;
  }

  h2 {
    font-size: ${39 / 16}rem;
  }

  h3 {
    font-size: ${31 / 16}rem;
  }

  h4 {
    font-size: ${25 / 16}rem;
  }

  h5 {
    font-size: ${20 / 16}rem;
  }

  h6 {
    font-size: ${16 / 16}rem;
  }

  strong {
    font-weight: 800;
  }

  em {
    font-style: italic;
  }

  blockquote {
    margin-top: ${({ theme }) => theme.spaces[8]};
    margin-bottom: ${({ theme }) => theme.spaces[7]};
    font-size: ${14 / 16}rem;
    font-weight: ${({ theme }) => theme.fontWeights.regular};
    border-left: 4px solid ${({ theme }) => theme.colors.neutral150};
    font-style: italic;
    padding: ${({ theme }) => theme.spaces[2]} ${({ theme }) => theme.spaces[5]};
  }

  img {
    max-width: 100%;
  }

  pre,
  pre > code {
    font-size: ${14 / 16}rem;
    border-radius: 4px;
    /* 
      Hard coded since the color is the same between themes,
      theme.colors.neutral800 changes between themes.

      Matches the color of the JSON Input component.
    */
    background-color: #32324d;
    max-width: 100%;
    overflow: auto;
    padding: ${({ theme }) => theme.spaces[2]};
  }

  p,
  pre {
    > code {
      color: #839496;
    }
  }

  /* Inline code */
  p {
    > * code {
      background-color: ${({ theme }) => theme.colors.neutral150};
    }
  }

  ol {
    list-style-type: decimal;
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
  }

  ul {
    list-style-type: disc;
    margin-block-start: ${({ theme }) => theme.spaces[4]};
    margin-block-end: ${({ theme }) => theme.spaces[4]};
    margin-inline-start: ${({ theme }) => theme.spaces[0]};
    margin-inline-end: ${({ theme }) => theme.spaces[0]};
    padding-inline-start: ${({ theme }) => theme.spaces[4]};

    ul,
    ol {
      margin-block-start: ${({ theme }) => theme.spaces[0]};
      margin-block-end: ${({ theme }) => theme.spaces[0]};
    }
  }
`;

export default Wrapper;
