import styled from 'styled-components';

const PermissionsWrapper = styled.div`
  padding: 2.5rem 3rem 1rem 3rem;
  border: 1px solid ${({ theme }) => theme.main.colors.darkBlue};
  border-top: none;
  background-color: ${({ theme }) => theme.main.colors.white};
`;

export default PermissionsWrapper;
