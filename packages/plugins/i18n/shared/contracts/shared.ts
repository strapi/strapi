import { Data } from '@strapi/strapi';

export interface Entity {
  id: Data.ID;
  createdAt: string;
  updatedAt: string;
}
