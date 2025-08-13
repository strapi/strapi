import { Flex, FlexProps } from '@strapi/design-system';
import { styled } from 'styled-components';

const MainNavWrapper = styled(Flex)<{ $isMobileShown: boolean }>`
  border-right: 1px solid ${({ theme }) => theme.colors.neutral150};
  position: fixed;
  max-height: 100%;
  height: ${({ $isMobileShown }) => ($isMobileShown ? '100vh' : 'auto')};

  ${({ theme }) => theme.breakpoints.large} {
    position: sticky;
    height: 100vh;
  }
`;

const MainNav = (props: FlexProps<'nav'> & { isMobileShown: boolean }) => (
  <MainNavWrapper
    alignItems="normal"
    tag="nav"
    background="neutral0"
    direction="column"
    top={0}
    zIndex={2}
    width={10}
    $isMobileShown={props.isMobileShown}
    {...props}
  />
);

export { MainNav };
