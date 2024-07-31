import type { Entity as StrapiEntity } from '@strapi/types';

// @TODO: Probably user & role types should be imported from a common package
interface RoleInfo extends Omit<Entity, 'createdAt' | 'updatedAt'> {
  name: string;
  code: string;
  description?: string;
  usersCount?: number;
}

export interface UserInfo extends Entity {
  firstname: string;
  lastname?: string;
  username?: null | string;
  email: string;
  isActive: boolean;
  blocked: boolean;
  preferedLanguage: null | string;
  roles: RoleInfo[];
}

export interface Entity {
  id: StrapiEntity.ID;
  createdAt: string;
  updatedAt: string;
}
