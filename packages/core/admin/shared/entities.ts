import type { Entity as TEntity } from '@strapi/types';

export interface Entity {
  id: TEntity.ID;
  createdAt: string;
  updatedAt: string;
}

/**
 * TODO: is there a way to infer this from the content-type schema?
 * TODO: define content-type schema for a role.
 */
export interface RoleEntity extends Entity {
  name: string;
  code: string;
  description?: string;
  usersCount?: number;
}

/**
 * TODO: is there a way to infer this from the content-type schema?
 * TODO: define content-type schema for a user.
 */
export interface UserEntity extends Entity {
  firstname: string;
  lastname?: string;
  username?: null | string;
  email: string;
  isActive: boolean;
  blocked: boolean;
  preferedLanguage: null | string;
  roles: RoleEntity[];
}
