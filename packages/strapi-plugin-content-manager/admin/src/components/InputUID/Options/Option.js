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
    background-color: ${({ theme }) => theme.main.colors.lightestBlue};
    .right-label {
      display: block;
    }
  }
  .right-label {
    display: block;
  }
`;

export default Option;
