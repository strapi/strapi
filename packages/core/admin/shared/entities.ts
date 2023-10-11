import type { Entity as TEntity } from '@strapi/types';

export interface Entity {
  id: TEntity.ID;
}

/**
 * TODO: is there a way to infer this from the content-type schema?
 * TODO: define content-type schema for a role.
 */
export interface RoleEntity extends Entity {
  name: string;
  code: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  usersCount?: number;
}
