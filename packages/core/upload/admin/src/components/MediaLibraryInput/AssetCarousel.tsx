import { Children, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

import { useIsMobile, useMediaQuery } from '@strapi/admin/strapi-admin';
import { Box, IconButton } from '@strapi/design-system';
import { ChevronLeft, ChevronRight } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled, useTheme } from 'styled-components';

import { getTranslationKey } from '../../utils/translations';

import type { ZoneVariant } from './AssetDropZone';

/** Narrowest a card and the tile get side by side before stacking, in px. */
const MIN_CARD_WIDTH = 130;
/**
 * Narrowest a card gets when two share the row, in px. Wider than the single
 * card's, so the row drops to one card before names are cut to a few letters.
 */
const MIN_CARD_WIDTH_FOR_TWO = 180;
const GAP = 16;
const MAX_CARDS = 2;

const Container = styled(Box)`
  background: ${({ theme }) => theme.colors.neutral100};
  border: 1px solid ${({ theme }) => theme.colors.neutral200};
  border-radius: ${({ theme }) => theme.borderRadius};
`;

const Track = styled.div<{ $columns: number }>`
  display: grid;
  grid-template-columns: repeat(${({ $columns }) => $columns}, minmax(0, 1fr));
  gap: ${GAP}px;
`;

const Cards = styled.div<{ $columns: number }>`
  position: relative;
  display: grid;
  grid-column: span ${({ $columns }) => $columns};
  grid-template-columns: repeat(${({ $columns }) => $columns}, minmax(0, 1fr));
  gap: ${GAP}px;
`;

const Arrow = styled(Box)<{ $side: 'start' | 'end' }>`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1;
  ${({ $side }) => ($side === 'start' ? 'left: -1.6rem;' : 'right: -1.6rem;')}

  button {
    border-radius: 50%;
    box-shadow: ${({ theme }) => theme.shadows.filterShadow};
  }
`;

interface RowLayout {
  /** Cards per row, the drop zone not included. */
  cards: number;
  /** Too narrow for a card and the tile side by side: the drop zone goes below. */
  isStacked: boolean;
}

/**
 * How the row fits the field. The edit layout's size sets it: a third of the
 * form stacks one card over the drop zone, a full-width field shows two cards
 * beside it, anything in between one. Mobile always shows one card, stacked on
 * a phone. The measured width can only take cards away, for a field squeezed
 * by a narrow component.
 */
const getRowLayout = ({
  width,
  layoutSize,
  isMobile,
  isPhone,
}: {
  width: number;
  layoutSize?: number;
  /** Below the tablet breakpoint: one card, whatever the layout says. */
  isMobile: boolean;
  /** Below the small breakpoint: the drop zone goes under the card. */
  isPhone: boolean;
}): RowLayout => {
  const isNarrowLayout = isPhone || (layoutSize !== undefined && layoutSize <= 4);
  const maxCards = isMobile || (layoutSize !== undefined && layoutSize < 12) ? 1 : MAX_CARDS;

  // Unmeasured: no layout yet, or no `ResizeObserver`.
  const isMeasured = width > 0;
  const fitsCardAndTile = !isMeasured || width >= 2 * MIN_CARD_WIDTH + GAP;
  const fitsTwoCardsAndTile = !isMeasured || width >= 3 * MIN_CARD_WIDTH_FOR_TWO + 2 * GAP;

  if (isNarrowLayout || !fitsCardAndTile) {
    return { cards: 1, isStacked: true };
  }

  return { cards: fitsTwoCardsAndTile ? maxCards : 1, isStacked: false };
};

interface AssetCarouselProps {
  /** One card per asset or upload, in field order. */
  children: ReactNode;
  /** Always shown: after the cards, or below them on a narrow field. */
  renderDropZone: (variant: Exclude<ZoneVariant, 'bar'>) => ReactNode;
  /** The field's width in the edit layout, out of 12, when the host knows it. */
  layoutSize?: number;
}

/**
 * A single row of cards followed by the drop tile. When the field holds more
 * than fit, arrows page through the cards and the tile stays put.
 */
export const AssetCarousel = ({ children, renderDropZone, layoutSize }: AssetCarouselProps) => {
  const { formatMessage } = useIntl();
  const theme = useTheme();
  const isMobile = useIsMobile();
  const isPhone = !useMediaQuery(theme.breakpoints.small);
  const trackRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [start, setStart] = useState(0);

  const cards = Children.toArray(children);
  const { cards: cardsPerRow, isStacked } = getRowLayout({ width, layoutSize, isMobile, isPhone });
  const maxStart = Math.max(cards.length - cardsPerRow, 0);
  const firstVisible = Math.min(start, maxStart);
  // Fewer cards than fit leave the tile right after them, not at the far end.
  const visibleCount = Math.min(cards.length, cardsPerRow);

  useLayoutEffect(() => {
    const track = trackRef.current;

    if (!track || typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(track);

    return () => observer.disconnect();
  }, []);

  // A card added at the end (a new upload) is scrolled into view.
  const previousCount = useRef(cards.length);
  useEffect(() => {
    if (cards.length > previousCount.current) {
      setStart(maxStart);
    }
    previousCount.current = cards.length;
  }, [cards.length, maxStart]);

  return (
    <Container padding={4}>
      <Track ref={trackRef} $columns={isStacked ? 1 : cardsPerRow + 1}>
        <Cards $columns={visibleCount}>
          {cards.slice(firstVisible, firstVisible + cardsPerRow)}

          {firstVisible > 0 && (
            <Arrow $side="start">
              <IconButton
                onClick={() => setStart(firstVisible - 1)}
                label={formatMessage({
                  id: getTranslationKey('mediaLibraryInput.actions.previousSlide'),
                  defaultMessage: 'Previous slide',
                })}
              >
                <ChevronLeft />
              </IconButton>
            </Arrow>
          )}

          {firstVisible < maxStart && (
            <Arrow $side="end">
              <IconButton
                onClick={() => setStart(firstVisible + 1)}
                label={formatMessage({
                  id: getTranslationKey('mediaLibraryInput.actions.nextSlide'),
                  defaultMessage: 'Next slide',
                })}
              >
                <ChevronRight />
              </IconButton>
            </Arrow>
          )}
        </Cards>
        {!isStacked && renderDropZone('tile')}
      </Track>
      {isStacked && <Box paddingTop={4}>{renderDropZone('stacked')}</Box>}
    </Container>
  );
};
