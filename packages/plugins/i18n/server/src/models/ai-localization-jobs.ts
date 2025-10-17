import type { Model } from '@strapi/database';

const AI_LOCALIZATION_JOBS_UID = 'plugin::i18n.ai-localization-jobs';

const aiLocalizationJobs: Model = {
  uid: AI_LOCALIZATION_JOBS_UID,
  tableName: 'strapi_ai_localization_jobs',
  singularName: 'ai-localization-jobs',
  attributes: {
    id: {
      type: 'increments',
    },
    contentType: {
      type: 'string',
      column: { notNullable: true },
    },
    relatedDocumentId: {
      type: 'string',
      column: { notNullable: true },
    },
    sourceLocale: {
      type: 'string',
      column: { notNullable: true },
    },
    targetLocales: {
      type: 'json',
      column: { notNullable: true },
    },
    status: {
      type: 'enumeration',
      enum: ['processing', 'completed', 'failed'],
      column: { notNullable: true },
    },
    createdAt: {
      type: 'datetime',
      default: () => new Date(),
    },
    updatedAt: {
      type: 'datetime',
      default: () => new Date(),
    },
  },
};

export { aiLocalizationJobs, AI_LOCALIZATION_JOBS_UID };
