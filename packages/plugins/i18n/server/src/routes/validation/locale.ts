import type { Core } from '@strapi/types';
import * as z from 'zod/v4';

/**
 * A validator for i18n locale routes.
 *
 */
export class I18nLocaleRouteValidator {
  protected readonly _strapi: Core.Strapi;

  public constructor(strapi: Core.Strapi) {
    this._strapi = strapi;
  }

  /**
   * Generates a validation schema for a single locale.
   *
   * @returns A schema for validating locale objects
   */
  get locale() {
    return z.object({
      id: z.number().int().positive(),
      documentId: z.string().uuid(),
      name: z.string(),
      code: z.string().length(2, 'Locale code must be exactly 2 characters'),
      createdAt: z.string(),
      updatedAt: z.string(),
      publishedAt: z.string().nullable(),
      isDefault: z.boolean(),
    });
  }

  /**
   * Generates a validation schema for an array of locales
   *
   * @returns A schema for validating arrays of locales
   */
  get locales() {
    return z.array(this.locale);
  }
}
