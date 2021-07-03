import styled from 'styled-components';
import Tab from './Tab';

const TabsWrapper = styled.div`
  display: block;
  border-radius: ${({ theme }) => theme.main.sizes.borderRadius};
  box-shadow: ${({ theme }) => `0px 2px 4px 0px ${theme.main.colors.darkGrey}`};

  ${Tab}:first-of-type {
    border-top-left-radius: ${({ theme }) => theme.main.sizes.borderRadius};
  }
  ${Tab}:last-of-type {
    border-top-right-radius: ${({ theme }) => theme.main.sizes.borderRadius};
  }
`;

export default TabsWrapper;
