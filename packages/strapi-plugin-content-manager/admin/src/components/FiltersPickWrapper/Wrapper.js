import styled from 'styled-components';

const Wrapper = styled.div`
  margin-top: -13px;
  > div:not(:first-child) {
    padding-top: 6px;
  }
  > div:last-child {
    margin-bottom: 7px;
  }
`;

export default Wrapper;
