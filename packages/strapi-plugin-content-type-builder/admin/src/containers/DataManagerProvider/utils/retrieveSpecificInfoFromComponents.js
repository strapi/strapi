import { get } from 'lodash';

const retrieveSpecificInfoFromComponents = (allComponents, keyToRetrieve) => {
  const allData = Object.keys(allComponents).map(compo => {
    return get(allComponents, [compo, keyToRetrieve], '');
  });

  return allData.filter((key, index) => {
    return key !== '' && allData.indexOf(key) === index;
  });
};

export default retrieveSpecificInfoFromComponents;
