import { flatMap, sumBy, values } from 'lodash';
import type { Schema, UID } from '@strapi/types';

const getNumberOfDynamicZones = () => {
  const contentTypes: Record<UID.ContentType, Schema.ContentType> = strapi.contentTypes;

  const attributes = flatMap(contentTypes, (contentType) => values(contentType.attributes));
  return sumBy(attributes, (attribute) => (attribute.type === 'dynamiczone' ? 1 : 0));
};

export default getNumberOfDynamicZones;
