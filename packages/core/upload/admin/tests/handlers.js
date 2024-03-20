import { rest } from 'msw';
import qs from 'qs';

const handlers = [
  rest.get('/upload/configuration', async (req, res, ctx) => {
    return res(
      ctx.json({
        data: {
          /**
           * we send the pageSize slightly different to defaults because
           * in tests we can track that the async functions have finished.
           */
          pageSize: 20,
          sort: 'updatedAt:DESC',
        },
      })
    );
  }),
  rest.put('/upload/configuration', async (req, res, ctx) => {
    return res(ctx.status(200));
  }),
  rest.get('/upload/folders/:id', async (req, res, ctx) => {
    return res(
      ctx.json({
        data: {
          id: 1,
          name: 'test',
          pathId: 1,
          path: '/1',
          createdAt: '2023-06-26T12:48:54.054Z',
          updatedAt: '2023-06-26T12:48:54.054Z',
          parent: null,
          children: {
            count: 2,
          },
          files: {
            count: 0,
          },
        },
      })
    );
  }),
  rest.delete('/upload/:type/:id', async (req, res, ctx) => {
    return res(
      ctx.json({
        id: 1,
      })
    );
  }),
  rest.get('/upload/folders', async (req, res, ctx) => {
    const query = qs.parse(req.url.search.slice(1));

    if (query._q) {
      return res(
        ctx.json({
          data: [
            {
              createdAt: '2023-06-26T12:48:54.054Z',
              id: 1,
              name: query._q,
              pathId: 1,
              path: '/1',
              updatedAt: '2023-06-26T12:48:54.054Z',
              children: {
                count: 2,
              },
              files: {
                count: 0,
              },
            },
          ],
        })
      );
    }

    if (Array.isArray(query.filters?.$and)) {
      const [{ parent }] = query.filters.$and;

      if (parent.id === '1') {
        return res(
          ctx.json({
            data: [
              {
                createdAt: '2023-06-26T12:49:31.354Z',
                id: 3,
                name: '2022',
                pathId: 3,
                path: '/1/3',
                updatedAt: '2023-06-26T12:49:31.354Z',
                children: {
                  count: 0,
                },
                files: {
                  count: 3,
                },
              },
              {
                createdAt: '2023-06-26T12:49:08.466Z',
                id: 2,
                name: '2023',
                pathId: 2,
                path: '/1/2',
                updatedAt: '2023-06-26T12:49:08.466Z',
                children: {
                  count: 0,
                },
                files: {
                  count: 3,
                },
              },
            ],
          })
        );
      }
    }

    return res(
      ctx.json({
        data: [
          {
            createdAt: '2023-06-26T12:48:54.054Z',
            id: 1,
            name: 'test',
            pathId: 1,
            path: '/1',
            updatedAt: '2023-06-26T12:48:54.054Z',
            children: {
              count: 2,
            },
            files: {
              count: 0,
            },
          },
        ],
      })
    );
  }),

  rest.get('*/some/file', async (req, res, ctx) => {
    const file = new File([new Blob(['1'.repeat(1024 * 1024 + 1)])], 'image.png', {
      type: 'image/png',
    });
    const buffer = await new Response(file).arrayBuffer();

    return res(ctx.set('Content-Type', 'image/png'), ctx.body(buffer));
  }),

  rest.get('/upload/settings', async (req, res, ctx) => {
    return res(
      ctx.json({
        data: {
          sizeOptimization: true,
          responsiveDimensions: true,
          autoOrientation: true,
        },
      })
    );
  }),

  rest.get('/upload/folder-structure', (req, res, ctx) => {
    return res(
      ctx.json({
        data: [
          {
            id: 1,
            name: 'test',
            children: [
              {
                id: 3,
                name: '2022',
                children: [],
              },
              {
                id: 2,
                name: '2023',
                children: [],
              },
            ],
          },
        ],
      })
    );
  }),

  rest.get('*/an-image.png', (req, res, ctx) =>
    res(ctx.set('Content-Type', 'image/png'), ctx.body())
  ),
  rest.get('*/a-pdf.pdf', (req, res, ctx) =>
    res(ctx.set('Content-Type', 'application/pdf'), ctx.body())
  ),
  rest.get('*/a-video.mp4', (req, res, ctx) =>
    res(ctx.set('Content-Type', 'video/mp4'), ctx.body())
  ),
  rest.get('*/not-working-like-cors.lutin', (req, res, ctx) => res(ctx.json({}))),
  rest.get('*/some-where-not-existing.jpg', (req, res) => res.networkError('Failed to fetch')),
];

export { handlers };
