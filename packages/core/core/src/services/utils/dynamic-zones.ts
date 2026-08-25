import { sumBy, pipe, flatMap } from 'lodash/fp';
import type { Schema, UID } from '@strapi/types';

const getNumberOfDynamicZones = () => {
  const contentTypes: Record<UID.ContentType, Schema.ContentType> = strapi.contentTypes;

  return pipe(
    (schemas: Record<UID.ContentType, Schema.ContentType>) =>
      Object.values(schemas).map((schema) => schema.attributes),
    flatMap(Object.values),
    sumBy((item) => {
      if (item.type === 'dynamiczone') {
        return 1;
      }
      return 0;
    })
  )(contentTypes);
};

export default getNumberOfDynamicZones;
