import { Flex, FlexComponent, FlexProps } from '@strapi/design-system';
import { styled } from 'styled-components';

const MainNavWrapper = styled<FlexComponent<'nav'>>(Flex)`
  border-right: 1px solid ${({ theme }) => theme.colors.neutral150};
  position: fixed;
  max-height: 100%;

  ${({ theme }) => theme.breakpoints.large} {
    position: sticky;
    height: 100vh;
  }
`;

const MainNav = (props: FlexProps<'nav'>) => (
  <MainNavWrapper
    alignItems="normal"
    tag="nav"
    background="neutral0"
    direction="column"
    top={0}
    zIndex={2}
    width={10}
    {...props}
  />
);

export { MainNav };
