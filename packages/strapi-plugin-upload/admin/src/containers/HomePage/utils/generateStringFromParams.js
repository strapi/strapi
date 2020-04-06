import { isEmpty, toString } from 'lodash';
import generateParamsFromQuery from './generateParamsFromQuery';

const generateStringFromParams = (query, paramsToFilter = []) => {
  let paramsString = '';
  const paramsObject = generateParamsFromQuery(query);

  Object.keys(paramsObject)
    .filter(key => {
      return !paramsToFilter.includes(key) && !isEmpty(toString(paramsObject[key]));
    })
    .forEach(key => {
      const value = paramsObject[key];

      if (key.includes('mime') && value === 'file') {
        const revertedKey = key.includes('_ncontains') ? 'mime_contains' : 'mime_ncontains';

        paramsString += `&${revertedKey}=image&${revertedKey}=video`;
      } else {
        paramsString += `&${key}=${value}`;
      }
    });

  return paramsString.substring(1);
};

export default generateStringFromParams;
