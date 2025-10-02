import { Flex, FlexProps } from '@strapi/design-system';
import { styled } from 'styled-components';

const MainNavWrapper = styled(Flex)`
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral150};
  position: fixed;
  max-height: 100%;
  height: auto;

  ${({ theme }) => theme.breakpoints.large} {
    border-bottom: none;
    border-right: 1px solid ${({ theme }) => theme.colors.neutral150};
    position: sticky;
    height: 100vh;
  }
`;

const MainNav = (props: FlexProps<'nav'>) => (
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
    {...props}
  />
);

export { MainNav };
