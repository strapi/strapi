import type { ValidTourName } from './types';

/* -------------------------------------------------------------------------------------------------
 * Data-only tour definitions (no React imports)
 * -----------------------------------------------------------------------------------------------*/

type TourMeta = {
  totalStepCount: number;
  displayedStepCount: number;
};

const GUIDED_TOUR_NAMES = [
  'contentTypeBuilder',
  'contentManager',
  'apiTokens',
  'strapiCloud',
] as const satisfies readonly ValidTourName[];

/**
 * Step counts mirror the step arrays in *Steps.tsx files.
 * Finish steps use excludeFromStepCount, reducing displayedStepCount by 1.
 */
const GUIDED_TOUR_META: Record<ValidTourName, TourMeta> = {
  contentTypeBuilder: { totalStepCount: 9, displayedStepCount: 8 },
  contentManager: { totalStepCount: 5, displayedStepCount: 4 },
  apiTokens: { totalStepCount: 5, displayedStepCount: 4 },
  strapiCloud: { totalStepCount: 0, displayedStepCount: 0 },
};

const guidedTours = GUIDED_TOUR_NAMES.reduce(
  (acc, tourName) => {
    acc[tourName] = { _meta: GUIDED_TOUR_META[tourName] };
    return acc;
  },
  {} as Record<ValidTourName, { _meta: TourMeta }>
);

export { GUIDED_TOUR_NAMES, GUIDED_TOUR_META, guidedTours };
