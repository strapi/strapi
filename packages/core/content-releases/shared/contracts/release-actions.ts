import { Attribute, Common } from '@strapi/types';
import type { Release, Pagination } from './releases';
import type { Entity } from '../types';

import type { errors } from '@strapi/utils';

type ReleaseActionEntry = Entity & {
  // Entity attributes
  [key: string]: Attribute.Any;
};

export interface ReleaseAction extends Entity {
  type: 'publish' | 'unpublish';
  entry: ReleaseActionEntry;
  contentType: Common.UID.ContentType;
  release: Release;
}

/**
 * POST /content-releases/:id/actions - Create a release action
 */
export declare namespace CreateReleaseAction {
  export interface Request {
    params: {
      releaseId: Release['id'];
    };
    body: {
      type: ReleaseAction['type'];
      entry: {
        id: ReleaseActionEntry['id'];
        contentType: Common.UID.ContentType;
      };
    };
  }

  export interface Response {
    data: ReleaseAction;
    error?: errors.ApplicationError | errors.ValidationError | errors.NotFoundError;
  }
}

/**
 * GET /content-releases/:id/actions - Get all release actions
 */
export declare namespace GetReleaseActions {
  export interface Request {
    params: {
      releaseId: Release['id']
    };
    query?: Partial<Pick<Pagination, 'page' | 'pageSize'>>;
  }

  export interface Response {
    data: 
      | ReleaseAction[]
      | {
        data: null;
        error: errors.ApplicationError | errors.NotFoundError;
      }
  }
}
