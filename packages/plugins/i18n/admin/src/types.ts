import type { Documents } from '@strapi/strapi';

export interface I18nBaseQuery {
  plugins?: {
    i18n?: {
      locale?: string;
      relatedEntityId?: Documents.ID;
    };
  };
}
