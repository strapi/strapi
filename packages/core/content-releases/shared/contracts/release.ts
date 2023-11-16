import type { Entity } from '../types';
import type { ReleaseAction } from './release-action';
import type { UserInfo } from '../types';
import { errors } from '@strapi/utils';

export interface Release extends Entity {
  name: string;
  releasedAt: string;
  actions: ReleaseAction[];
}

type Pagination = {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
};

interface ReleaseDataResponse extends Omit<Release, 'actions'> {
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

  export type Response =
    | {
        data: ReleaseDataResponse[];
        pagination: Pagination;
      }
    | {
        data: null;
        error: errors.ApplicationError;
      };
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

  export type Response =
    | {
        data: ReleaseDataResponse;
      }
    | {
        data: null;
        error: errors.ApplicationError | errors.NotFoundError;
      };
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

  export type Response =
    | {
        data: ReleaseDataResponse;
      }
    | {
        data: null;
        error: errors.ApplicationError | errors.ValidationError;
      };
}
