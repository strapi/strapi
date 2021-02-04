import styled from 'styled-components';

const Wrapper = styled.div`
  position: relative;
  padding-bottom: 27px;
  label {
    display: block;
    margin-bottom: 1rem;
  }
  > p {
    width: 100%;
    padding-top: 10px;
    font-size: 13px;
    line-height: normal;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: -8px;
  }
  input[type='checkbox'] {
    margin-bottom: 13px;
  }
`;

export default Wrapper;
