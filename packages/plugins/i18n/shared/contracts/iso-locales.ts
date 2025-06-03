import { errors } from '@strapi/utils';

export interface ISOLocale {
  code: string;
  name: string;
}

/**
 * GET /i18n/iso-locales - Get all the locales
 */
export declare namespace GetISOLocales {
  export interface Request {
    query: {};
    body: {};
  }

  /**
   * TODO: this should follow the usual `data/error` pattern.
   */
  export type Response =
    | ISOLocale[]
    | {
        data: null;
        error: errors.ApplicationError;
      };
}
