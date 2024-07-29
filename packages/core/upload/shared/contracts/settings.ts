/**
 * Used to store user configurations related to media files.
 * E.g the size optimization flag, the responsive dimensions flag and the auto orientation.
 */

import { errors } from '@strapi/utils';
import { Utils } from '@strapi/types';

export interface Settings {
  sizeOptimization: boolean;
  responsiveDimensions: boolean;
  autoOrientation: boolean;
}

/**
 * GET /upload/settings
 *
 * Return the stored settings for the media files.
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
 * PUT /upload/settings
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
