import styled from 'styled-components';

const MenuWrapper = styled.div`
  background-color: ${props => props.theme.main.colors.mediumGrey};
  min-height: 100%;
  height: calc(100vh - ${({ theme }) => theme.main.sizes.header.height});
`;

export default MenuWrapper;
