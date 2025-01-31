import { Attribute, Common, Schema } from '@strapi/types';
import type { Release, Pagination } from './releases';
import type { Entity } from '../types';

import type { errors } from '@strapi/utils';

export type ReleaseActionEntry = Entity & {
  // Entity attributes
  [key: string]: Attribute.Any;
} & {
  locale?: string;
};

export interface ReleaseAction extends Entity {
  type: 'publish' | 'unpublish';
  entry: ReleaseActionEntry;
  contentType: Common.UID.ContentType;
  locale?: string;
  release: Release;
  isEntryValid: boolean;
}

export interface FormattedReleaseAction extends Entity {
  type: 'publish' | 'unpublish';
  entry: ReleaseActionEntry;
  contentType: {
    uid: Common.UID.ContentType;
    mainFieldValue?: string;
    displayName: string;
  };
  locale?: {
    name: string;
    code: string;
  };
  release: Release;
}

/**
 * POST /content-releases/:releaseId/actions - Create a release action
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
        locale?: ReleaseActionEntry['locale'];
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
 * POST /content-releases/:releaseId/actions/bulk - Create multiple release actions
 */
export declare namespace CreateManyReleaseActions {
  export interface Request {
    params: {
      releaseId: Release['id'];
    };
    body: Array<{
      type: ReleaseAction['type'];
      entry: {
        id: ReleaseActionEntry['id'];
        locale?: ReleaseActionEntry['locale'];
        contentType: Common.UID.ContentType;
      };
    }>;
  }

  export interface Response {
    data: Array<ReleaseAction>;
    meta: {
      totalEntries: number;
      entriesAlreadyInRelease: number;
    };
    error?: errors.ApplicationError | errors.ValidationError | errors.NotFoundError;
  }
}

/**
 * GET /content-releases/:id/actions - Get all release actions
 */

export type ReleaseActionGroupBy = 'contentType' | 'action' | 'locale';
export declare namespace GetReleaseActions {
  export interface Request {
    params: {
      releaseId: Release['id'];
    };
    query?: Partial<Pick<Pagination, 'page' | 'pageSize'>> & {
      groupBy?: ReleaseActionGroupBy;
    };
  }

  export interface Response {
    data: {
      [key: string]: Array<FormattedReleaseAction>;
    };
    meta: {
      pagination: Pagination;
      contentTypes: Record<Schema.ContentType['uid'], Schema.ContentType>;
      components: Record<Schema.Component['uid'], Schema.Component>;
    };
  }
}

/*
 * DELETE /content-releases/:releaseId/actions/:actionId - Delete a release action
 */
export declare namespace DeleteReleaseAction {
  export interface Request {
    params: {
      actionId: ReleaseAction['id'];
      releaseId: Release['id'];
    };
  }

  export interface Response {
    data: ReleaseAction;
    error?: errors.ApplicationError | errors.NotFoundError;
  }
}

/*
 * PUT /content-releases/:releaseId/actions/:actionId - Update a release action
 */
export declare namespace UpdateReleaseAction {
  export interface Request {
    params: {
      actionId: ReleaseAction['id'];
      releaseId: ReleaseAction['id'];
    };
    body: {
      type: ReleaseAction['type'];
    };
  }

  export interface Response {
    data: ReleaseAction;
    error?: errors.ApplicationError | errors.ValidationError | errors.NotFoundError;
  }
}
