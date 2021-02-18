import styled from 'styled-components';

const Wrapper = styled.div`
  display: flex;
  justify-content: center;
  height: 30px;
  width: 35px;
  background: #ffffff;
  border: 1px solid #e3e9f3;
  border-radius: 2px;
  > div {
    margin: auto;
    > label {
      margin-left: 0;
    }
  }
`;

export default Wrapper;
