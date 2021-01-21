import styled from 'styled-components';

const Bloc = styled.div`
  flex: 1;
  background: ${({ theme }) => theme.main.colors.white};
  border-radius: ${({ theme }) => theme.main.sizes.borderRadius};
  box-shadow: 0 2px 4px #e3e9f3;
`;

export default Bloc;
