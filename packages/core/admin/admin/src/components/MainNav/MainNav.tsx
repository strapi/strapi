import { Flex, FlexProps } from '@strapi/design-system';
import { styled } from 'styled-components';

const MainNavWrapper = styled(Flex)<{ $isMobileShown: boolean }>`
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral150};
  position: fixed;
  max-height: 100%;
  height: ${({ $isMobileShown }) => ($isMobileShown ? '100vh' : 'auto')};

  ${({ theme }) => theme.breakpoints.large} {
    border-bottom: none;
    border-right: 1px solid ${({ theme }) => theme.colors.neutral150};
    position: sticky;
    height: 100vh;
  }
`;

const MainNav = ({ isMobileShown, ...props }: FlexProps<'nav'> & { isMobileShown: boolean }) => (
  <MainNavWrapper
    alignItems="normal"
    tag="nav"
    background="neutral0"
    direction={{
      initial: 'row',
      large: 'column',
    }}
    top={0}
    zIndex={3}
    width={{
      initial: '100%',
      large: 10,
    }}
    $isMobileShown={isMobileShown}
    {...props}
  />
);

export { MainNav };
