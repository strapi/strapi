import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const handlers = [
  http.get(
    '*/getInfos',
    () => {
      return HttpResponse.json(
        {
          documentationAccess: { restrictedAccess: false },
          currentVersion: '1.0.0',
          docVersions: [
            { version: '1.0.0', generatedDoc: '10/05/2021 2:52:44 PM' },
            { version: '1.2.0', generatedDoc: '11/05/2021 3:00:00 PM' },
            { version: '2.0.0', generatedDoc: '11/06/2021 3:00:00 PM' },
          ],
          prefix: '/documentation',
        },
        { status: 200 }
      );
    },
    { once: true }
  ),
  http.post('*/regenerateDoc', () => {
    return HttpResponse.json(null, { status: 200 });
  }),
  http.delete('*/deleteDoc/:version', () => {
    return HttpResponse.json(null, { status: 200 });
  }),
  http.put('*/updateSettings', () => {
    return HttpResponse.json(null, { status: 200 });
  }),
];

const server = setupServer(...handlers);

export { server };
