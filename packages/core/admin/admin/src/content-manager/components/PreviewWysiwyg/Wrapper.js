import styled from 'styled-components';

const Wrapper = styled.div`
  position: absolute;
  top: 0;
  width: 100%;
  height: 100%;
  overflow: auto;
  padding: ${({ theme }) => `${theme.spaces[3]} ${theme.spaces[4]}`};
  font-size: ${14 / 16}rem;
  background-color: ${({ theme }) => theme.colors.neutral0};
  z-index: 2;
  cursor: not-allowed;
  color: ${({ theme }) => theme.colors.neutral800};

  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    margin-block-start: 10px;
    margin-block-end: 10px;
  }

  h1 {
    font-size: ${36 / 16}rem;
    font-weight: 600;
  }

  h2 {
    font-size: ${30 / 16}rem;
    font-weight: 500;
  }

  h3 {
    font-size: ${24 / 16}rem;
    font-weight: 500;
  }

  h4 {
    font-size: ${20 / 16}rem;
    font-weight: 500;
  }

  strong {
    font-weight: 800;
  }

  em {
    font-style: italic;
  }

  blockquote {
    margin-top: 41px;
    margin-bottom: 34px;
    font-size: ${14 / 16}rem;
    font-weight: 400;
    border-left: 5px solid #eee;
    font-style: italic;
    padding: 10px 20px;
  }

  img {
    max-width: 100%;
  }

  table {
    font-size: 13px;
    thead {
      background: rgb(243, 243, 243);
      tr {
        height: 43px;
      }
    }
    tr {
      border: 1px solid #c6cbd1;
    }
    th,
    td {
      padding: 0 25px;
      border: 1px solid #c6cbd1;
      border-bottom: 0;
      border-top: 0;
    }

    tbody {
      tr {
        height: 54px;
      }
    }
  }

  pre,
  code {
    font-size: 13px;
    border-radius: 3px;
    background-color: #002b36;
  }

  /* Inline code */
  p,
  pre,
  td {
    > code {
      color: #839496;
    }
  }

  .warning {
    background-color: #faa684;
    padding: 30px;
    border-radius: 3px;
  }
  .tip {
    padding: 30px;
    border-radius: 3px;
  }

  .footnote-ref,
  .footnote-backref {
    color: #007bff;
  }

  ol {
    list-style-type: decimal;
    margin-block-start: ${({ theme }) => theme.spaces[4]};
    margin-block-end: ${({ theme }) => theme.spaces[4]};
    margin-inline-start: 0px;
    margin-inline-end: 0px;
    padding-inline-start: ${({ theme }) => theme.spaces[4]};
    ol,
    ul {
      margin-block-start: 0px;
      margin-block-end: 0px;
    }
  }

  ul {
    list-style-type: disc;
    margin-block-start: ${({ theme }) => theme.spaces[4]};
    margin-block-end: ${({ theme }) => theme.spaces[4]};
    margin-inline-start: 0px;
    margin-inline-end: 0px;
    padding-inline-start: ${({ theme }) => theme.spaces[4]};
    ul,
    ol {
      margin-block-start: 0px;
      margin-block-end: 0px;
    }
  }
`;

export default Wrapper;
