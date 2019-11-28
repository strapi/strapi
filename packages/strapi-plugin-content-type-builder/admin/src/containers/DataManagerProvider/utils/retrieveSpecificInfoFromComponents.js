import { get } from 'lodash';

const retrieveSpecificInfoFromComponents = (allComponents, keysToRetrieve) => {
  const allData = Object.keys(allComponents).map(compo => {
    return get(allComponents, [compo, ...keysToRetrieve], '');
  });

  return allData.filter((key, index) => {
    return key !== '' && allData.indexOf(key) === index;
  });
};

export default retrieveSpecificInfoFromComponents;
