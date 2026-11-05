import type { Modules } from '@strapi/types';

import type {
  HistoryVersionAuthor,
  HistoryVersionSource,
} from '../../../../shared/contracts/history-versions';

export type RequestContext = NonNullable<ReturnType<Modules.RequestContext.RequestContext['get']>>;

export interface HistoryOrigin {
  source: HistoryVersionSource;
  author: HistoryVersionAuthor;
}
