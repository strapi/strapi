import type { AvailableSpace } from '../services/spaces';

/**
 * The workspace list, mirrored outside React for the code that runs where
 * hooks cannot: the Content Manager's list-view hook waterfalls (column and
 * filter injection). Kept fresh by the always-mounted `SpaceSwitcher`.
 */
let knownSpaces: AvailableSpace[] = [];

export const setKnownSpaces = (spaces: AvailableSpace[]): void => {
  knownSpaces = spaces;
};

export const getKnownSpaces = (): AvailableSpace[] => knownSpaces;
