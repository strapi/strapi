/* eslint-disable check-file/filename-naming-convention */

export interface APIBaseParams {
  filters?: unknown;
  locale?: string;
  publicationState?: 'preview' | 'live';
  sort?: unknown;
}

export type APIResponsePagination = {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
};

export type APIResponseMeta = {
  pagination: APIResponsePagination;
};

export type APIResponse<TRes = any> = {
  data: TRes;
  meta: APIResponseMeta;
};

// TODO: the users API response shape is outdated and should be updated
export type APIResponseUsersLegacy<TRes = any> = {
  data: TRes;
};
