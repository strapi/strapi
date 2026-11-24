import { Flex, FlexProps } from '@strapi/design-system';
import { styled } from 'styled-components';

import { useStrapiApp } from '../../features/StrapiApp';

/**
 * With a tint, `--main-nav-tint` holds the colour: a light wash of it on the navigation, and the
 * active link in it. Mixed with the theme's own colours, so it works in light and dark mode. Icons
 * are a shade darker than without a tint, and the active one is half the tint, half the theme
 * text colour, so they keep a 3:1 contrast on the wash with light tints too
 */
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

  &[data-tinted] {
    background: color-mix(
      in srgb,
      var(--main-nav-tint) 12%,
      ${({ theme }) => theme.colors.neutral0}
    );
    border-color: color-mix(
      in srgb,
      var(--main-nav-tint) 30%,
      ${({ theme }) => theme.colors.neutral150}
    );

    a {
      background: transparent;
    }

    /* Only the link icon: badges, like the license lightning, keep their own colour */
    a:not(.active) > svg path {
      fill: ${({ theme }) => theme.colors.neutral600};
    }

    /* The theme hover colour under the same wash, so hover shows as much as without a tint */
    a:hover {
      background: color-mix(
        in srgb,
        var(--main-nav-tint) 12%,
        ${({ theme }) => theme.colors.neutral100}
      );
    }

    a.active {
      background: color-mix(
        in srgb,
        var(--main-nav-tint) 22%,
        ${({ theme }) => theme.colors.neutral0}
      );

      > svg path {
        fill: color-mix(
          in srgb,
          var(--main-nav-tint) 50%,
          ${({ theme }) => theme.colors.neutral800}
        );
      }
    }
  }
`;

/**
 * `CSS.supports` accepts these as a colour, but `color-mix()` cannot use them
 */
const NOT_A_COLOUR = /^(inherit|initial|unset|revert|revert-layer)$|\b(var|env)\(/i;

/**
 * A value that is not a colour would make every `color-mix()` rule invalid, and the navigation
 * transparent. Accepted where the browser cannot check it
 */
const isColor = (value: string | null): value is string =>
  value != null &&
  !NOT_A_COLOUR.test(value.trim()) &&
  (typeof CSS === 'undefined' ||
    typeof CSS.supports !== 'function' ||
    CSS.supports('color', value));

/**
 * The first tint that returns a colour wins
 */
const useMainNavTint = (): string | null => {
  const tints = useStrapiApp('MainNav', (state) => state.mainNav.tints);

  // The registry is locked once the admin renders, and every tint runs on every render, so the
  // hooks keep their order even when one returns null
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const colors = tints.map((useTint) => useTint());

  return colors.find(isColor) ?? null;
};

const MainNav = ({ style, ...props }: FlexProps<'nav'>) => {
  const tint = useMainNavTint();

  return (
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
      data-tinted={tint ? '' : undefined}
      style={tint ? { ...style, ['--main-nav-tint' as string]: tint } : style}
      {...props}
    />
  );
};

export { MainNav };
