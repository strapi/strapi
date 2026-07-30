import * as React from 'react';

import { useTheme } from 'styled-components';

/**
 * Hook to detect if a media query matches
 * @param query - Media query string (e.g., '(min-width: 768px)' or theme.breakpoints.large)
 * @returns boolean indicating if the media query matches
 */
export const useMediaQuery = (query: string): boolean => {
  const cleanQuery = query.replace('@media', '').trim();

  const [matches, setMatches] = React.useState(() => window.matchMedia(cleanQuery).matches);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia(cleanQuery);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);

    mediaQuery.addEventListener('change', handler);

    return () => mediaQuery.removeEventListener('change', handler);
  }, [cleanQuery]);

  return matches;
};

/**
 * Hook to detect if the current viewport is desktop size
 * Uses the theme's large breakpoint
 */
export const useIsDesktop = (): boolean => {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.large);
};

/**
 * Hook to detect if the current viewport is tablet size
 * Uses the theme's medium breakpoint
 */
export const useIsTablet = (): boolean => {
  const theme = useTheme();
  const isTabletOrAbove = useMediaQuery(theme.breakpoints.medium);
  const isDesktop = useMediaQuery(theme.breakpoints.large);
  return isTabletOrAbove && !isDesktop;
};

/**
 * Hook to detect if the current viewport is mobile size
 * Uses the theme's medium breakpoint (inverted)
 */
export const useIsMobile = (): boolean => {
  const theme = useTheme();
  return !useMediaQuery(theme.breakpoints.medium);
};
