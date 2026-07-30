import { errors } from '@strapi/utils';
import { Entity } from './shared';

export interface Locale extends Entity {
  code: string;
  isDefault: boolean;
  name: string;
  /**
   * Space visibility binding, populated when `@strapi/plugin-spaces` is installed
   * (empty array = platform-wide). Absent otherwise.
   */
  spaces?: Array<{ id: number; slug: string; name: string; color: string | null }>;
  /**
   * Slugs of the spaces this locale is the effective default locale of. Attached
   * by the spaces default-locale strategy; absent when spaces isn't installed.
   */
  isDefaultIn?: string[];
}

/**
 * GET /i18n/locales - Get all the locales
 */
export declare namespace GetLocales {
  export interface Request {
    query: {};
    body: {};
  }

  /**
   * TODO: this should follow the usual `data/error` pattern.
   */
  export type Response =
    | Locale[]
    | {
        data: null;
        error: errors.ApplicationError;
      };
}

/**
 * POST /i18n/locales - Create a single locale
 */
export declare namespace CreateLocale {
  export interface Request {
    query: {};
    body: Omit<Locale, keyof Entity>;
  }

  /**
   * TODO: this should follow the usual `data/error` pattern.
   */
  export type Response =
    | Locale
    | {
        data: null;
        error: errors.ApplicationError;
      };
}

/**
 * DEL /i18n/locales/:id - Delete a single locale
 */
export declare namespace DeleteLocale {
  export interface Request {
    query: {};
    body: {};
  }

  export interface Params {
    id: Locale['id'];
  }

  /**
   * TODO: this should follow the usual `data/error` pattern.
   */
  export type Response =
    | Locale
    | {
        data: null;
        error: errors.ApplicationError;
      };
}

/**
 * PUT /i18n/locales/:id - Update a single locale
 */
export declare namespace UpdateLocale {
  export interface Request {
    query: {};
    body: Pick<Locale, 'name' | 'isDefault'>;
  }

  export interface Params {
    id: Locale['id'];
  }

  /**
   * TODO: this should follow the usual `data/error` pattern.
   */
  export type Response =
    | Locale
    | {
        data: null;
        error: errors.ApplicationError;
      };
}
