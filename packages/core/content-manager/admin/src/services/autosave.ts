/**
 * Per-user backups of uncommitted edits, so work survives a different device or cleared browser
 * storage. Never part of the shared draft until the author saves or restores it.
 */
import { contentManagerApi } from './api';

import type { DeleteAutosave, GetAutosave, SaveAutosave } from '../../../shared/contracts/autosave';

interface AutosaveParams {
  model: string;
  documentId: string;
  locale?: string;
}

const autosaveApi = contentManagerApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getAutosave: builder.query<GetAutosave.Response, AutosaveParams>({
      query: ({ model, documentId, locale }) => ({
        url: `/content-manager/autosaves/${model}/${documentId}`,
        method: 'GET',
        config: {
          params: locale ? { locale } : undefined,
        },
      }),
    }),
    saveAutosave: builder.mutation<
      SaveAutosave.Response,
      AutosaveParams & { data: SaveAutosave.Request['body'] }
    >({
      query: ({ model, documentId, locale, data }) => ({
        url: `/content-manager/autosaves/${model}/${documentId}`,
        method: 'PUT',
        data,
        config: {
          params: locale ? { locale } : undefined,
        },
      }),
    }),
    deleteAutosave: builder.mutation<DeleteAutosave.Response, AutosaveParams>({
      query: ({ model, documentId, locale }) => ({
        url: `/content-manager/autosaves/${model}/${documentId}`,
        method: 'DELETE',
        config: {
          params: locale ? { locale } : undefined,
        },
      }),
    }),
  }),
});

const { useLazyGetAutosaveQuery, useSaveAutosaveMutation, useDeleteAutosaveMutation } = autosaveApi;

export { useLazyGetAutosaveQuery, useSaveAutosaveMutation, useDeleteAutosaveMutation };
export type { AutosaveParams };
