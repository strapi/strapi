import { Entity } from '@strapi/types';

// @TODO: Probably user & role types should be imported from a common package
interface RoleInfo {
  id: Entity.ID;
  name: string;
  code: string;
  description?: string;
  usersCount?: number;
}

export interface UserInfo {
  id: Entity.ID;
  firstname: string;
  lastname?: string;
  username?: null | string;
  email: string;
  isActive: boolean;
  blocked: boolean;
  preferedLanguage: null | string;
  roles: RoleInfo[];
  createdAt: string;
  updatedAt: string;
}

interface ReleaseActionEntry {
  id: Entity.ID;
  contentType: string;
}

// TODO: Could we not have the types generated from the schema?
interface ReleaseAction {
  type: 'publish' | 'unpublish';
  entry: ReleaseActionEntry;
  contentType: string;
  release: Release;
}

// TODO: Could we not have the types generated from the schema?
export interface Release {
  id: Entity.ID;
  name: string;
  releasedAt: Date;
  actions: ReleaseAction[];
}

export type ReleaseCreateArgs = Pick<Release, 'name'>;

export interface ReleaseActionCreateArgs extends Pick<ReleaseAction, 'type' | 'entry'> {
  releaseId: number;
}
