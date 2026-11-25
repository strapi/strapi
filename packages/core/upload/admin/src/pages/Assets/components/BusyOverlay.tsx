import { Flex, Loader } from '@strapi/design-system';
import { styled } from 'styled-components';

/**
 * Translucent overlay for a container with a long-running mutation in flight,
 * covering it and centring a labelled loader.
 *
 * Used by the asset details drawer (over the whole form) and by the list's rows
 * and cards (over the one item being replaced). It positions against the
 * nearest positioned ancestor, so the container must be `position: relative`.
 *
 * `$zIndex` is a prop because the two callers stack differently: in the drawer
 * it has to clear the in-drawer toast slot at 10, while in a row it only has to
 * clear the row's own content.
 */
const BusyOverlayRoot = styled(Flex)<{ $zIndex: number }>`
  position: absolute;
  inset: 0;
  z-index: ${({ $zIndex }) => $zIndex};
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.colors.neutral0};
  opacity: 0.7;
`;

interface BusyOverlayProps {
  /** Shown next to the spinner, and read out as the loader's accessible label. */
  children: string;
  zIndex?: number;
  /** Hides the label, leaving the spinner — for containers too small to fit text. */
  hideLabel?: boolean;
}

export const BusyOverlay = ({ children, zIndex = 20, hideLabel = false }: BusyOverlayProps) => (
  <BusyOverlayRoot $zIndex={zIndex}>
    <Loader small={hideLabel}>{children}</Loader>
  </BusyOverlayRoot>
);
