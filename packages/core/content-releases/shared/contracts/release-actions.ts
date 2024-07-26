import type { Schema, Modules, UID, Struct } from '@strapi/types';
import type { Release, Pagination } from './releases';
import type { Entity } from '../types';

import type { errors } from '@strapi/utils';

type ReleaseActionEntryType = 'single-types' | 'collection-types';

export type ReleaseActionEntry = Modules.Documents.AnyDocument & {
  // Entity attributes
  [key: string]: Schema.Attribute.AnyAttribute;
} & {
  locale?: string;
};

export interface ReleaseAction extends Entity {
  type: 'publish' | 'unpublish';
  entry: ReleaseActionEntry;
  contentType: UID.ContentType;
  entryDocumentId: ReleaseActionEntry['documentId'];
  locale?: string;
  release: Release;
  isEntryValid: boolean;
  status: 'draft' | 'published' | 'modified';
}

export interface FormattedReleaseAction extends Entity {
  type: 'publish' | 'unpublish';
  entry: ReleaseActionEntry;
  contentType: {
    uid: UID.ContentType;
    mainFieldValue?: string;
    displayName: string;
  };
  locale?: {
    name: string;
    code: string;
  };
  release: Release;
  status: 'draft' | 'published' | 'modified';
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
      contentType: UID.ContentType;
      entryDocumentId?: ReleaseActionEntry['documentId'];
      locale?: ReleaseActionEntry['locale'];
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
      contentType: UID.ContentType;
      entryDocumentId: ReleaseActionEntry['documentId'];
      locale?: ReleaseActionEntry['locale'];
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
      contentTypes: Record<Struct.ContentTypeSchema['uid'], Struct.ContentTypeSchema>;
      components: Record<Struct.ComponentSchema['uid'], Struct.ComponentSchema>;
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
