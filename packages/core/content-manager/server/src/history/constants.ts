import type { HistoryVersionSource } from '../../../shared/contracts/history-versions';

export const HISTORY_VERSION_UID = 'plugin::content-manager.history-version';
export const FIELDS_TO_IGNORE = [
  'createdAt',
  'updatedAt',
  'publishedAt',
  'createdBy',
  'updatedBy',
  'strapi_stage',
  'strapi_assignee',
  'strapi_position',
];

export const HISTORY_VERSION_SOURCES = [
  'admin-panel',
  'admin-api',
] as const satisfies readonly HistoryVersionSource[];
