import { type RequestHandler, http, HttpResponse } from 'msw';

import { mockHistoryVersionsData } from './mockData';

const historyHandlers: RequestHandler[] = [
  http.get('/content-manager/history-versions', () => {
    return HttpResponse.json(mockHistoryVersionsData.historyVersions);
  }),
];

export { historyHandlers };
