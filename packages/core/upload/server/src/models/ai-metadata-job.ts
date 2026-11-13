import type { Model } from '@strapi/database';

const AI_METADATA_JOB_UID = 'plugin::upload.ai-metadata-job';

const aiMetadataJob: Model = {
  uid: AI_METADATA_JOB_UID,
  tableName: 'strapi_ai_metadata_jobs',
  singularName: 'ai-metadata-job',
  attributes: {
    id: {
      type: 'increments',
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
    completedAt: {
      type: 'datetime',
      default: null,
    },
    // Written at an interval by the process that runs the job, as epoch milliseconds. A
    // `processing` job whose heartbeat is stale or missing was interrupted (see
    // `failInterruptedJobs`). Not a `datetime`: Postgres and MySQL store those as local wall
    // time, which a time zone's DST change shifts by an hour.
    heartbeatAtMs: {
      type: 'biginteger',
      default: null,
    },
  },
};

export { aiMetadataJob, AI_METADATA_JOB_UID };
