import { rest } from 'msw';

export const HANDLERS = [
  rest.get('/admin/review-workflows/workflows', (req, res, ctx) => {
    return res(
      ctx.json({
        data: [
          {
            id: 1,
            stages: [
              {
                id: 1,
                name: 'To Review',
                color: '#FFFFFF',
              },
            ],
          },
        ],
      })
    );
  }),
  rest.get('/admin/review-workflows/workflows/:id', (req, res, ctx) =>
    res(
      ctx.json({
        data: {
          id: 1,
          stages: [
            {
              id: 1,
              name: 'To Review',
              color: '#FFFFFF',
            },
          ],
        },
      })
    )
  ),
  rest.get('/content-manager/collection-types/:contentType/stages', (req, res, ctx) =>
    res(
      ctx.json({
        data: [
          {
            id: 1,
            name: 'Todo',
          },

          {
            id: 2,
            name: 'Done',
          },
        ],

        meta: {
          workflowCount: 10,
          stagesCount: 5,
        },
      })
    )
  ),
  rest.get('/content-manager/single-types/:contentType/stages', (req, res, ctx) =>
    res(
      ctx.json({
        data: [
          {
            id: 2,
            name: 'Todo',
          },

          {
            id: 3,
            name: 'Done',
          },
        ],

        meta: {
          workflowCount: 10,
          stagesCount: 5,
        },
      })
    )
  ),
  rest.put('/admin/content-manager/collection-types/:contentType/:id/assignee', (req, res, ctx) => {
    return res(ctx.status(200));
  }),
  rest.get('/admin/content-manager/:collectionType/:contentType/:id/stages', (req, res, ctx) =>
    res(
      ctx.json({
        data: [
          {
            id: 1,
            color: '#4945FF',
            name: 'Stage 1',
          },

          {
            id: 2,
            color: '#4945FF',
            name: 'Stage 2',
          },
        ],
        meta: {
          workflowCount: 10,
        },
      })
    )
  ),
];
