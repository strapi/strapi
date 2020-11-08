import styled from 'styled-components';

const Wrapper = styled.div`
  z-index: 1;
  padding: 1rem;
  background-color: ${({ theme }) => theme.main.colors['gray-dark']};
  cursor: pointer;
`;

export default Wrapper;
