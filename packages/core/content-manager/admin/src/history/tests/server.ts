import { type HttpHandler, http, HttpResponse } from 'msw';

import { mockHistoryVersionsData } from './mockData';

const historyHandlers: HttpHandler[] = [
  http.get('/content-manager/history-versions', () => {
    return HttpResponse.json(mockHistoryVersionsData.historyVersions);
  }),
];

export { historyHandlers };
