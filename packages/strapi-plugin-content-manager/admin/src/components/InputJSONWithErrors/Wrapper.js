import styled from 'styled-components';

const Wrapper = styled.div`
  padding-bottom: 26px;

  label {
    margin-bottom: 1rem;
    line-height: 18px;
    display: block;
  }
  > div {
    border-radius: 4px;
    border: 1px solid #090300;
  }
  &.bordered {
    > div {
      border-color: red;
    }
  }
  > p {
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

export default Wrapper;
