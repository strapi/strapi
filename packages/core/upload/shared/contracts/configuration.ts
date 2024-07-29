/**
 * Used to store the media library configuration.
 * E.g the page size, the sort.
 */

import { errors } from '@strapi/utils';
import { Utils } from '@strapi/types';

type PageSize = 10 | 20 | 50 | 100;

type SortOrder = 'ASC' | 'DESC';

type SortKey = 'createdAt' | 'name';

export interface Configuration {
  pageSize: PageSize;
  sort: `${SortKey}:${SortOrder}`;
}

/**
 * GET /upload/configuration
 *
 * Return the configuration for the media files.
 */
export declare namespace GetConfiguration {
  export interface Request {
    query?: {};
  }

  export interface Response {
    data: Configuration;
  }
}

/**
 * PUT /upload/configuration
 *
 * Update the configuration
 */
export declare namespace UpdateConfiguration {
  export interface Request {
    body: Configuration;
  }

  export type Response = Utils.OneOf<
    { data: Configuration },
    { error?: errors.ApplicationError | errors.ValidationError }
  >;
}
