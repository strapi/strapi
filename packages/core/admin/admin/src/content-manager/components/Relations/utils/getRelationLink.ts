import type { Data } from '@strapi/types';

export function getRelationLink(targetModel: string, id?: Data.ID) {
  return `/content-manager/collection-types/${targetModel}/${id ?? ''}`;
}
