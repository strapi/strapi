/**
 * Used to store user configurations related to i18n.
 * E.g the AI metadata flag for automatic translations.
 */

import { errors } from '@strapi/utils';
import type { Utils } from '@strapi/types';

export interface Settings {
  data: {
    aiLocalizations?: boolean;
  };
}

export type SettingsData = Settings['data'];

/**
 * GET /i18n/settings
 *
 * Return the stored settings for the i18n plugin.
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
 * PUT /i18n/settings
 *
 * Update the stored settings
 */
export declare namespace UpdateSettings {
  export interface Request {
    body: Settings['data'];
  }

  export type Response = Utils.OneOf<
    { data: Settings['data'] },
    { error?: errors.ApplicationError | errors.ValidationError }
  >;
}
