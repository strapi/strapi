import get from 'lodash/get';

import { makeUnique } from '../../../utils/makeUnique';

import type { Components } from '../../../types';

export const retrieveSpecificInfoFromComponents = (
  allComponents: Components,
  keysToRetrieve: string[]
) => {
  const allData = Object.keys(allComponents).map((compo) => {
    return get(allComponents, [compo, ...keysToRetrieve], '') as string;
  });

  return makeUnique(allData);
};
