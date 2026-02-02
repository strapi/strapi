import type { errors } from '@strapi/utils';
import { Entity, Permission } from './shared';

export interface Action {
  actionId: string;
  applyToProperties: string[];
  label: string;
  subjects: string[];
}

export interface SubjectProperty {
  children?: SubjectProperty[];
  label: string;
  required?: boolean;
  value: string;
}

export interface Subject {
  label: string;
  properties: SubjectProperty[];
  uid: string;
}

export interface ContentPermission {
  actions: Action[];
  subjects: Subject[];
}

export interface SettingPermission {
  action: string;
  displayName: string;
  category: string;
  subCategory: string;
}

export interface PluginPermission {
  action: string;
  displayName: string;
  plugin: string;
  subCategory: string;
}

export interface Condition {
  id: string;
  displayName: string;
  category: string;
}

/**
 * GET /permission - List all permissions
 */
export declare namespace GetAll {
  export interface Request {
    query: {};
    body: {};
    params: {
      role: Entity['id'];
    };
  }

  export interface Response {
    data: {
      conditions: Condition[];
      sections: {
        collectionTypes: ContentPermission;
        plugins: PluginPermission[];
        settings: SettingPermission[];
        singleTypes: ContentPermission;
      };
    };
    error?: errors.ApplicationError;
  }
}

/**
 * POST /permission/check - Check if the current user has the given permissions
 */
export declare namespace Check {
  export interface Request {
    query: {};
    body: {
      permissions: (Pick<Permission, 'action' | 'subject'> & { field?: string })[];
    };
  }

  export interface Response {
    data: boolean[];
    error?: errors.ApplicationError | errors.YupValidationError;
  }
}
