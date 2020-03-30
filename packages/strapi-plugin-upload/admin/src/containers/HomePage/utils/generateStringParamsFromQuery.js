import { isEmpty, toString } from 'lodash';

const generateStringParamsFromQuery = query => {
  let params = '';

  Object.keys(query)
    .filter(key => !isEmpty(toString(query[key])))
    .forEach(key => {
      const value = query[key];

      if (key === 'filters') {
        value.forEach(item => {
          if (item.name.includes('mime') && item.value === 'file') {
            const revertedKey = item.filter.includes('_ncontains')
              ? 'mime_contains'
              : 'mime_ncontains';
            const filterValue = `${revertedKey}=image&${revertedKey}=video`;

            params += `&${filterValue}`;
          } else {
            const name = item.filter === '=' ? item.name : `${item.name}${item.filter}`;
            params += `&${name}=${item.value}`;
          }
        });
      } else {
        params += `&${key}=${value}`;
      }
    });

  return params.substring(1);
};

export default generateStringParamsFromQuery;
