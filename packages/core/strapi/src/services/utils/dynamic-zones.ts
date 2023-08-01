import { map, values, sumBy, pipe, flatMap } from 'lodash/fp';

const getNumberOfDynamicZones = () => {
  return pipe(
    map('attributes'),
    flatMap(values),
    sumBy((item) => {
      if (item.type === 'dynamiczone') {
        return 1;
      }
      return 0;
    })
  )(strapi.contentTypes);
};

export default getNumberOfDynamicZones;
