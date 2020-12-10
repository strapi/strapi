import styled from 'styled-components';

const Wrapper = styled.li`
  padding: 0 16px;
  height: 36px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  &:hover {
    cursor: pointer;
    background-color: ${({ theme }) => theme.main.colors.mediumGrey};
  }
`;

export default Wrapper;
