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
    /* Workspace accent: plugins may set --strapi-workspace-color on the root
       (e.g. @strapi/plugin-spaces) — the color then rises from the bottom of
       the nav. Without the variable the gradient is transparent → invisible. */
    background-image: linear-gradient(
      to bottom,
      transparent 55%,
      color-mix(in srgb, var(--strapi-workspace-color, transparent) 22%, transparent) 100%
    );
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
