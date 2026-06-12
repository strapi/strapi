import { Flex, FlexProps } from '@strapi/design-system';
import { styled } from 'styled-components';

const MainNavWrapper = styled(Flex)`
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral150};
  position: sticky;
  max-height: 100%;
  height: auto;
  z-index: 4;

  ${({ theme }) => theme.breakpoints.large} {
    border-bottom: none;
    border-right: 1px solid ${({ theme }) => theme.colors.neutral150};
    height: 100dvh;
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
    width={{
      initial: '100dvw',
      large: 10,
    }}
    {...props}
  />
);

export { MainNav };
