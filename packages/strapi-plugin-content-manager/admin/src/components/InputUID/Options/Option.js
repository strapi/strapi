import styled from 'styled-components';

const Option = styled.div`
  &:hover {
    background-color: #e4f0fc;
    .right-label {
      display: block;
    }
  }
  cursor: pointer;
  line-height: 2.6rem;
  font-size: 1.5rem;
  padding: 5px;
  display: flex;
  justify-content: space-between;
  .right-label {
    display: none;
  }
`;

export default Option;
