import { Data } from '@strapi/types';

export interface Entity {
  id: Data.ID;
  createdAt: string;
  updatedAt: string;
}
