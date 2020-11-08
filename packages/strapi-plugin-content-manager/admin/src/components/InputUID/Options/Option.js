import styled from 'styled-components';

const Option = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 0.5rem 1rem;
  font-size: 1.5rem;
  line-height: 3rem;
  cursor: pointer;
  &:hover {
    background-color: #e4f0fc;
    .right-label {
      display: block;
    }
  }
  .right-label {
    display: block;
  }
`;

export default Option;
