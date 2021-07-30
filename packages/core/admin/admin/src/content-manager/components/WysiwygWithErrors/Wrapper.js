import styled from 'styled-components';

const Wrapper = styled.div`
  padding-bottom: 2.8rem;
  font-size: 1.3rem;
  font-family: 'Lato';
  label {
    display: block;
    margin-bottom: 1rem;
  }
  &.bordered {
    .editorWrapper {
      border-color: red;
    }
  }
  > div + p {
    width: 100%;
    padding-top: 12px;
    font-size: 1.2rem;
    line-height: normal;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: -9px;
  }

  div,
  pre,
  code {
    ::-webkit-scrollbar {
      height: 5px;
      width: 5px;
      cursor: default;
    }
  }
`;

export default Wrapper;
