import { Entity as StrapiEntity } from '@strapi/types';
import { errors } from '@strapi/utils';

export interface Entity {
  id: StrapiEntity.ID;
  createdAt: string;
  updatedAt: string;
}

export interface Release extends Entity {
  name: string;
}

/**
 * POST /content-releases - Create a single release
 */
export declare namespace CreateRelease {
  export interface Request {
    query: {};
    body: Omit<Release, keyof Entity>;
  }

  export interface Response {
    data: Release;
    /**
     * TODO: check if we also could recieve errors.YupValidationError
     */
    error?: errors.ApplicationError;
  }
}

/**
 * GET /content-releases - Get all the release
 */
export declare namespace GetAllReleases {
  export interface Request {
    query: {};
    body: {};
  }

  /**
   * TODO: Validate this with BE
   */
  export interface Response {
    data: Release[];
    error?: errors.ApplicationError;
  }
}
