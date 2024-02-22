import { Entity as StrapiEntity } from '@strapi/strapi';

export interface Entity {
  id: StrapiEntity.ID;
  createdAt: string;
  updatedAt: string;
}
