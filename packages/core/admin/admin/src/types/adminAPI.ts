/* eslint-disable check-file/filename-naming-convention */

export interface APIBaseParams {
  filters?: unknown;
  locale?: string;
  publicationState?: 'preview' | 'live';
  sort?: unknown;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type APIResponse<TRes = any> = {
  data: TRes;
};
