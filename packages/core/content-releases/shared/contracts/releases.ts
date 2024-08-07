import type { Entity } from '../types';
import type { ReleaseAction } from './release-actions';
import type { UserInfo } from '../types';
import { errors } from '@strapi/utils';
import type { SanitizedAdminUser } from '@strapi/admin/strapi-admin';

export interface Release extends Entity {
  name: string;
  releasedAt: string | null;
  scheduledAt: string | null;
  status: 'ready' | 'blocked' | 'failed' | 'done' | 'empty';
  // We save scheduledAt always in UTC, but users can set the release in a different timezone to show that in the UI for everyone
  timezone: string | null;
  actions: ReleaseAction[];
}

export type Pagination = {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
};

export interface ReleaseDataResponse extends Omit<Release, 'actions'> {
  actions: { meta: { count: number } };
  createdBy: SanitizedAdminUser;
}

export interface ReleaseForContentTypeEntryDataResponse extends Omit<Release, 'actions'> {
  actions: ReleaseAction[];
}

/**
 * GET /content-releases/ - Get releases paginated
 */
export declare namespace GetReleases {
  export interface Request {
    state: {
      userAbility: {};
    };
    query?: Partial<Pick<Pagination, 'page' | 'pageSize'>>;
  }

  export interface Response {
    data: ReleaseDataResponse[];
    meta: {
      pagination?: Pagination;
      pendingReleasesCount?: number;
    };
    error?: errors.ApplicationError;
  }
}

/**
 * GET /content-releases/findByDocumentAttached - Get releases paginated
 */
export declare namespace GetReleasesByDocumentAttached {
  export interface Request {
    state: {
      userAbility: {};
    };
    query: {
      contentType: string;
      entryDocumentId: ReleaseAction['entry']['entryDocumentId'];
      locale?: string;
      hasEntryAttached?: boolean;
    };
  }

  export interface Response {
    data: ReleaseForContentTypeEntryDataResponse[];
    error?: errors.ApplicationError;
  }
}

/**
 * GET /content-releases/mapEntriesToReleases - Map entries to releases
 */
export declare namespace MapEntriesToReleases {
  export interface Request {
    query: {
      contentTypeUid: ReleaseAction['contentType'];
      documentIds: ReleaseAction['entryDocumentId'][];
      locale?: ReleaseAction['locale'];
    };
  }

  export interface Response {
    data: {
      [documentId: ReleaseAction['entryDocumentId']]: Pick<Release, 'id' | 'name'>[];
    };
  }
}

/**
 * GET /content-releases/:id - Get a single release
 */
export declare namespace GetRelease {
  export interface Request {
    state: {
      userAbility: {};
    };
    params: {
      id: Release['id'];
    };
  }

  export interface Response {
    data: ReleaseDataResponse;
    error?: errors.ApplicationError | errors.NotFoundError;
  }
}

/**
 * POST /content-releases/ - Create a release
 */
export declare namespace CreateRelease {
  export interface Request {
    state: {
      user: UserInfo;
    };
    body: {
      name: string;
      scheduledAt: Date | null;
      timezone: string | null;
    };
  }

  export interface Response {
    data: ReleaseDataResponse;
    error?: errors.ApplicationError | errors.ValidationError;
  }
}

/**
 * PUT /content-releases/:id - Update a release
 */
export declare namespace UpdateRelease {
  export interface Request {
    state: {
      user: UserInfo;
    };
    params: {
      id: Release['id'];
    };
    body: {
      name: string;
      // When editing a release, scheduledAt always need to be explicitly sended, so it can be null to unschedule it
      scheduledAt?: Date | null;
      timezone?: string | null;
    };
  }

  export interface Response {
    data: ReleaseDataResponse;
    error?: errors.ApplicationError | errors.ValidationError;
  }
}

/**
 * DELETE /content-releases/:id - Delete a release
 */
export declare namespace DeleteRelease {
  export interface Request {
    state: {
      user: UserInfo;
    };
    params: {
      id: Release['id'];
    };
  }

  export interface Response {
    data: ReleaseDataResponse;
    error?: errors.ApplicationError | errors.NotFoundError;
  }
}

/**
 * POST /content-releases/:releaseId/publish - Publish a release
 */
export declare namespace PublishRelease {
  export interface Request {
    state: {
      user: UserInfo;
    };
    params: {
      id: Release['id'];
    };
  }

  export interface Response {
    data: ReleaseDataResponse;
    meta: {
      totalEntries: number;
      totalPublishedEntries: number;
      totalUnpublishedEntries: number;
    };
    error?: errors.ApplicationError | errors.ValidationError;
  }
}
