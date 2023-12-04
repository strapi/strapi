import type { Entity } from '../types';
import type { ReleaseAction } from './release-actions';
import type { UserInfo } from '../types';
import { errors } from '@strapi/utils';
import { UID } from '@strapi/types';

export interface Release extends Entity {
  name: string;
  releasedAt: string;
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
}

/**
 * GET /content-releases/ - Get all releases
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
    };
    error?: errors.ApplicationError;
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
    };
  }

  export interface Response {
    data: ReleaseDataResponse;
    error?: errors.ApplicationError | errors.ValidationError;
  }
}

/**
 * POST /content-releases/:id/publish - Publish a release
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
    error?: errors.ApplicationError | errors.ValidationError;
  }
}
