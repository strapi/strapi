import { map, values, sumBy, pipe, flatMap } from 'lodash/fp';
import { Schema } from '@strapi/types';

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
  )(strapi.contentTypes as Record<string, Schema.ContentType>);
};

export default getNumberOfDynamicZones;
