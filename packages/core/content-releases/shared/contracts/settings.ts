/**
 * Used to store user configurations related to releases.
 * E.g the default timezone for the release schedule.
 */

import { errors } from '@strapi/utils';
import { Utils } from '@strapi/types';

export interface Settings {
  defaultTimezone: string | null | undefined;
}

/**
 * GET /content-releases/settings
 *
 * Return the stored settings. If not set,
 * it will return an object with null values
 */
export declare namespace GetSettings {
  export interface Request {
    query?: {};
  }

  export interface Response {
    data: Settings;
  }
}

/**
 * PUT /content-releases/settings
 *
 * Update the stored settings
 */
export declare namespace UpdateSettings {
  export interface Request {
    body: Settings;
  }

  export type Response = Utils.OneOf<
    { data: Settings },
    { error?: errors.ApplicationError | errors.ValidationError }
  >;
}
