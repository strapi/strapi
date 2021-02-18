import styled from 'styled-components';

const TabsWrapper = styled.div`
  display: block;
  border-radius: ${({ theme }) => theme.main.sizes.borderRadius};
  box-shadow: ${({ theme }) => `0px 2px 4px 0px ${theme.main.colors.darkGrey}`};
`;

export default TabsWrapper;
