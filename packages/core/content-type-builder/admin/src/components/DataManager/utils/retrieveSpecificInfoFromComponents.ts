import get from 'lodash/get';

import { makeUnique } from '../../../utils/makeUnique';

export const retrieveSpecificInfoFromComponents = (allComponents: any, keysToRetrieve: any) => {
  const allData = Object.keys(allComponents).map((compo) => {
    return get(allComponents, [compo, ...keysToRetrieve], '');
  });

  return makeUnique(allData);
};
