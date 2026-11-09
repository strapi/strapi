import { endUsersApi } from './api';

import type {
  MigrationReportItem,
  MigrationStatusResponse,
  ProjectFiles,
} from '../../../shared/contracts/migration';

type MigrationStatus = MigrationStatusResponse['data'];

/** The admin routes answer `{ data }`. */
type Answer<T> = { data: T };

/**
 * The migration from Users & Permissions: its status and report, acknowledging an item, the check,
 * and the project files it plans. In check mode these are the only routes the plugin serves.
 */
const migrationApi = endUsersApi.injectEndpoints({
  endpoints: (builder) => ({
    getEndUsersMigrationStatus: builder.query<MigrationStatus, void>({
      query: () => '/end-users/migration',
      transformResponse: (response: Answer<MigrationStatus>) => response.data,
      providesTags: [{ type: 'EndUsersMigration', id: 'STATUS' }],
    }),
    updateEndUsersMigrationItem: builder.mutation<
      MigrationReportItem,
      { id: string; resolved: boolean }
    >({
      query: ({ id, resolved }) => ({
        url: `/end-users/migration/items/${encodeURIComponent(id)}`,
        method: 'PUT',
        data: { resolved },
      }),
      transformResponse: (response: Answer<MigrationReportItem>) => response.data,
      // The unresolved count, in the banner too, comes from the status
      invalidatesTags: [{ type: 'EndUsersMigration', id: 'STATUS' }],
    }),
    /** Runs the check again: in check mode only */
    runEndUsersMigrationCheck: builder.mutation<MigrationStatus, void>({
      query: () => ({ url: '/end-users/migration/check', method: 'POST' }),
      transformResponse: (response: Answer<MigrationStatus>) => response.data,
      invalidatesTags: [
        { type: 'EndUsersMigration', id: 'STATUS' },
        { type: 'EndUsersMigration', id: 'FILES' },
      ],
    }),
    getEndUsersProjectFiles: builder.query<ProjectFiles, void>({
      query: () => '/end-users/migration/files',
      transformResponse: (response: Answer<ProjectFiles>) => response.data,
      providesTags: [{ type: 'EndUsersMigration', id: 'FILES' }],
    }),
    /** Answers 204 once the files are written, and Strapi restarts */
    writeEndUsersProjectFiles: builder.mutation<void, void>({
      query: () => ({ url: '/end-users/migration/files', method: 'POST' }),
    }),
  }),
});

const {
  useGetEndUsersMigrationStatusQuery: useGetMigrationStatusQuery,
  useUpdateEndUsersMigrationItemMutation: useUpdateMigrationItemMutation,
  useRunEndUsersMigrationCheckMutation: useRunMigrationCheckMutation,
  useGetEndUsersProjectFilesQuery: useGetProjectFilesQuery,
  useWriteEndUsersProjectFilesMutation: useWriteProjectFilesMutation,
} = migrationApi;

export {
  useGetMigrationStatusQuery,
  useGetProjectFilesQuery,
  useRunMigrationCheckMutation,
  useUpdateMigrationItemMutation,
  useWriteProjectFilesMutation,
};
export type { MigrationStatus };
