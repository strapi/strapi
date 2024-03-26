import { Entity as StrapiEntity } from '@strapi/types';

export interface Entity {
  id: StrapiEntity.ID;
  createdAt: string;
  updatedAt: string;
}
