import type { Documents } from '@strapi/types';

export interface I18nBaseQuery {
  plugins?: {
    i18n?: {
      locale?: string;
      relatedEntityId?: Documents.ID;
    };
  };
}
