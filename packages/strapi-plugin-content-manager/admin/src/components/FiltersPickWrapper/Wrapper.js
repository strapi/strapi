import styled from 'styled-components';

const Wrapper = styled.div`
  margin-top: -13px;
  > div:not(:first-child) {
    padding-top: 2px;
  }
  > div:last-child {
    margin-bottom: 2px;
  }
`;

export default Wrapper;
