import styled from 'styled-components';

const Wrapper = styled.div`
  margin-bottom: 0;
  font-weight: 400;
  label {
    cursor: pointer;
  }
  p {
    margin-left: 1.2rem;
  }

  .disabled {
    cursor: not-allowed;
  }
`;

export default Wrapper;
