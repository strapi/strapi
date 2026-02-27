import type { Model } from '@strapi/database';

const AI_LOCALIZATION_JOB_UID = 'plugin::i18n.ai-localization-job';

const aiLocalizationJob: Model = {
  uid: AI_LOCALIZATION_JOB_UID,
  tableName: 'strapi_ai_localization_jobs',
  singularName: 'ai-localization-job',
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

export { aiLocalizationJob, AI_LOCALIZATION_JOB_UID };
