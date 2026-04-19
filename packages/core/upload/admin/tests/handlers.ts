import { type HttpHandler, http, HttpResponse } from 'msw';
import * as qs from 'qs';

// Define the expected structure of your query parameters
interface CustomQuery extends qs.ParsedQs {
  filters?: {
    $and?: Array<{ parent: { id: string } }>;
  };
}

const handlers: HttpHandler[] = [
  http.get('/upload/configuration', () => {
    return HttpResponse.json({
      data: {
        /**
         * we send the pageSize slightly different to defaults because
         * in tests we can track that the async functions have finished.
         */
        pageSize: 20,
        sort: 'updatedAt:DESC',
      },
    });
  }),
  http.put('/upload/configuration', () => {
    return HttpResponse.json({});
  }),
  http.get('/upload/folders/:id', () => {
    return HttpResponse.json({
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
    });
  }),
  http.delete('/upload/:type/:id', () => {
    return HttpResponse.json({
      id: 1,
    });
  }),
  http.get('/upload/folders', ({ request }) => {
    const query: CustomQuery = qs.parse(new URL(request.url).search.slice(1));

    if (query._q) {
      return HttpResponse.json({
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
      });
    }

    if (Array.isArray(query.filters?.$and)) {
      const [{ parent }] = query.filters.$and;

      if (parent.id === '1') {
        return HttpResponse.json({
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
        });
      }
    }

    return HttpResponse.json({
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
    });
  }),

  http.post<never, { name: string; parent: number | null }>(
    '/upload/folders',
    async ({ request }) => {
      const body = await request.json();
      return HttpResponse.json({
        data: {
          id: 10,
          name: body.name,
          pathId: 10,
          path: '/10',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          parent: body.parent ? { id: body.parent } : null,
          children: { count: 0 },
          files: { count: 0 },
        },
      });
    }
  ),

  http.get('*/some/file', async () => {
    const file = new File([new Blob(['1'.repeat(1024 * 1024 + 1)])], 'image.png', {
      type: 'image/png',
    });
    const buffer = await new Response(file).arrayBuffer();

    return new HttpResponse(buffer, {
      headers: { 'Content-Type': 'image/png' },
    });
  }),

  http.get('/upload/settings', () => {
    return HttpResponse.json({
      data: {
        sizeOptimization: true,
        responsiveDimensions: true,
        autoOrientation: true,
        aiMetadata: true,
      },
    });
  }),

  http.get('/upload/actions/generate-ai-metadata/count', () => {
    return HttpResponse.json({
      count: 0,
    });
  }),

  http.get('/upload/actions/generate-ai-metadata/latest', () => {
    return HttpResponse.json(null);
  }),

  http.get('/upload/folder-structure', () => {
    return HttpResponse.json({
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
    });
  }),

  http.get(
    '*/an-image.png',
    () =>
      new HttpResponse('Successful response', {
        headers: { 'Content-Type': 'image/png' },
      })
  ),
  http.get(
    '*/a-pdf.pdf',
    () =>
      new HttpResponse('Successful response', {
        headers: { 'Content-Type': 'application/pdf' },
      })
  ),
  http.get(
    '*/a-video.mp4',
    () =>
      new HttpResponse('Successful response', {
        headers: { 'Content-Type': 'video/mp4' },
      })
  ),
  http.get('*/not-working-like-cors.lutin', () => HttpResponse.json({})),
  http.get('*/some-where-not-existing.jpg', () => HttpResponse.error()),
];

export { handlers };
