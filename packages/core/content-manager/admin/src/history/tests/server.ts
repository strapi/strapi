import { type RequestHandler, rest } from 'msw';

import { mockHistoryVersionsData } from '@content-manager/admin/history/tests/mockData';

const historyHandlers: RequestHandler[] = [
  rest.get('/content-manager/history-versions', (req, res, ctx) => {
    return res(ctx.json(mockHistoryVersionsData.historyVersions));
  }),
];

export { historyHandlers };
