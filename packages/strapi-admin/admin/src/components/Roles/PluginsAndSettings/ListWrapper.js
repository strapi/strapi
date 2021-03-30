import styled from 'styled-components';

const ListWrapper = styled.div`
  background-color: ${({ theme }) => theme.main.colors.white};
  border-bottom-left-radius: ${({ theme }) => theme.main.sizes.borderRadius};
  border-bottom-right-radius: ${({ theme }) => theme.main.sizes.borderRadius};
  padding: 1.8rem 0;
`;

export default ListWrapper;
