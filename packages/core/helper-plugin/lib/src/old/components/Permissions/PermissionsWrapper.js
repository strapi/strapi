import styled from 'styled-components';

// TODO : @HichamELBSI This need to be updated when lists are standardized
const PermissionsWrapper = styled.div`
  padding: ${({ isWhite }) => (isWhite ? '1.6rem 3rem 1rem 3rem' : '2.5rem 3rem 1rem 3rem')};
  border: 1px solid ${({ theme }) => theme.main.colors.darkBlue};
  border-top: none;
  background-color: ${({ theme }) => theme.main.colors.white};
`;

export default PermissionsWrapper;
