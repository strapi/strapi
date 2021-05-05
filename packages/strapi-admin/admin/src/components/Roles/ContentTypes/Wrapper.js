import styled from 'styled-components';

const Wrapper = styled.div`
  background-color: ${({ theme }) => theme.main.colors.white};
  overflow: auto;
  border-bottom-left-radius: ${({ theme }) => theme.main.sizes.borderRadius};
  border-bottom-right-radius: ${({ theme }) => theme.main.sizes.borderRadius};
  ::-webkit-scrollbar {
    height: 10px;
  }
`;

export default Wrapper;
