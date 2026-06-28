import { createContext } from '@strapi/admin/strapi-admin';

import type {
  ContentType,
  FindContentTypeConfiguration,
} from '../../../shared/contracts/content-types';
import type {
  GetHistoryVersions,
  HistoryVersionDataResponse,
} from '../../../shared/contracts/history-versions';
import type { EditLayout } from '../../hooks/useDocumentLayout';
import type { UID } from '@strapi/types';

type HistoryContextValue = {
  contentType: UID.ContentType;
  id?: string;
  layout: EditLayout['layout'];
  configuration: FindContentTypeConfiguration.Response['data'];
  selectedVersion: HistoryVersionDataResponse;
  versions: Extract<GetHistoryVersions.Response, { data: Array<HistoryVersionDataResponse> }>;
  page: number;
  mainField: string;
  schema: ContentType;
};

const [HistoryProvider, useHistoryContext] = createContext<HistoryContextValue>('HistoryPage');

export { HistoryProvider, useHistoryContext };
export type { HistoryContextValue };
