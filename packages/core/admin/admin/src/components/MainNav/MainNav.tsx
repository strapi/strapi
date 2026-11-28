import { Flex, FlexProps } from '@strapi/design-system';
import { styled } from 'styled-components';

import { GLOBAL_BANNERS_HEIGHT } from '../../constants/theme';

const MainNavWrapper = styled(Flex)`
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral150};
  position: sticky;
  max-height: 100%;
  height: auto;
  z-index: 4;

  ${({ theme }) => theme.breakpoints.large} {
    border-bottom: none;
    border-right: 1px solid ${({ theme }) => theme.colors.neutral150};
    /* The global banners sit above the navigation and take their own height. */
    height: calc(100dvh - ${GLOBAL_BANNERS_HEIGHT});
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
