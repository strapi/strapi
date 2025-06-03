import { setupServer } from 'msw/node';
import { rest } from 'msw';

const handlers = [
  rest.get('*/getInfos', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        documentationAccess: { restrictedAccess: false },
        currentVersion: '1.0.0',
        docVersions: [
          { version: '1.0.0', generatedDoc: '10/05/2021 2:52:44 PM' },
          { version: '1.2.0', generatedDoc: '11/05/2021 3:00:00 PM' },
          { version: '2.0.0', generatedDoc: '11/06/2021 3:00:00 PM' },
        ],
        prefix: '/documentation',
      })
    );
  }),
  rest.post('*/regenerateDoc', (req, res, ctx) => {
    return res(ctx.status(200));
  }),
  rest.delete('*/deleteDoc/:version', (req, res, ctx) => {
    return res(ctx.status(200));
  }),
  rest.put('*/updateSettings', (req, res, ctx) => {
    return res(ctx.status(200));
  }),
];

const server = setupServer(...handlers);

export { server };
