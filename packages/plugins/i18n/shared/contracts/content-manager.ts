import { Entity } from '@strapi/types';
import { errors } from '@strapi/utils';

/**
 * POST /i18n/content-manager/actions/actions/get-non-localized-fields - Get the localized fields
 */
export declare namespace GetNonLocalizedFields {
  export interface Request {
    query: {};
    body: {
      id?: Entity.ID;
      locale?: string;
      model: string;
    };
  }

  /**
   * TODO: this should follow the usual `data/error` pattern.
   */
  export type Response =
    | {
        nonLocalizedFields: object;
        localizations: Array<{ id: Entity.ID; locale: string; publishedAt: string | null }>;
      }
    | {
        data: null;
        error: errors.ApplicationError;
      };
}
