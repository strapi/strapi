import { get } from 'lodash';
import makeUnique from '../../../utils/makeUnique';

const retrieveSpecificInfoFromComponents = (allComponents, keysToRetrieve) => {
  const allData = Object.keys(allComponents).map(compo => {
    return get(allComponents, [compo, ...keysToRetrieve], '');
  });

  return makeUnique(allData);
};

export default retrieveSpecificInfoFromComponents;
