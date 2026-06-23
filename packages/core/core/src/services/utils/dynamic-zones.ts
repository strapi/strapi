import fp from 'lodash/fp.js';
import type { Schema, UID } from '@strapi/types';

const { map, values, sumBy, pipe, flatMap } = fp;

const getNumberOfDynamicZones = () => {
  const contentTypes: Record<UID.ContentType, Schema.ContentType> = strapi.contentTypes;

  return pipe(
    map('attributes'),
    flatMap(values),
    sumBy((item) => {
      if (item.type === 'dynamiczone') {
        return 1;
      }
      return 0;
    })
  )(contentTypes);
};

export default getNumberOfDynamicZones;
