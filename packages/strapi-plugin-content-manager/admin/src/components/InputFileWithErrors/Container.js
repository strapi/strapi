import styled from 'styled-components';

const Container = styled.div`
  min-width: 200px;
  font-size: 1.3rem;
  padding-bottom: 26px;

  .labelFile {
    margin-bottom: 9px;
  }

  .labelNumber {
    font-weight: 500;
  }

  &.bordered {
    .editorWrapper {
      border-color: red;
    }
  }
  > div + p {
    width 100%;
    padding-top: 14px;
    font-size: 1.2rem;
    line-height: normal;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: -11px;
  }
`;

export default Container;
