import { isObject } from 'lodash';

const createHeadersObjectFromArray = array => {
  return array.reduce((acc, current, index) => {
    const createHeaderObject = (obj, i, middle = '') =>
      Object.keys(obj).reduce((acc1, current1) => {
        if (isObject(obj[current1])) {
          return {
            ...acc1,
            ...createHeaderObject(obj[current1], i, `_${current1}`),
          };
        }

        const name = `header${middle}_${current1}_${i}`;

        acc1[name] = obj[current1];

        return acc1;
      }, {});

    const headerObject = createHeaderObject(current, index + 1);

    return { ...acc, ...headerObject };
  }, {});
};

export default createHeadersObjectFromArray;
