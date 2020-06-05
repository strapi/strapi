import styled from 'styled-components';

const Wrapper = styled.div`
  background-color: ${({ theme }) => theme.main.colors.white};
  overflow: auto;

  ::-webkit-scrollbar {
    height: 10px;
  }
`;

export default Wrapper;
