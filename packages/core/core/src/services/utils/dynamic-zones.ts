import type { Schema, UID } from '@strapi/types';

const getNumberOfDynamicZones = () => {
  const contentTypes: Record<UID.ContentType, Schema.ContentType> = strapi.contentTypes;

  const attributes = Object.values(contentTypes ?? {}).flatMap((contentType) =>
    Object.values(contentType.attributes ?? {})
  );
  return attributes.filter((attribute) => attribute.type === 'dynamiczone').length;
};

export default getNumberOfDynamicZones;
