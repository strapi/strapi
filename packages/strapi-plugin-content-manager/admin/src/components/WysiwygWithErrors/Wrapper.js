import styled from 'styled-components';

const Wrapper = styled.div`
  padding-bottom: 2.9rem;
  font-size: 1.3rem;
  font-family: 'Lato'; 
  &.bordered {
    .editorWrapper {
      border-color: red;
    }
  }
  > div + p {
    width 100%;
    padding-top: 13px;
    font-size: 1.2rem;
    line-height: normal;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: -10px;
  }
`;

export default Wrapper;
