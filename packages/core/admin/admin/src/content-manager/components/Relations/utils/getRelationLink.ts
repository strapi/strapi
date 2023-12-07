import { Entity } from '@strapi/types';

export function getRelationLink(targetModel: string, id?: Entity.ID) {
  return `/content-manager/collectionType/${targetModel}/${id ?? ''}`;
}
