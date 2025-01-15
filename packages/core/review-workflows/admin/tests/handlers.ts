import { http, HttpResponse } from 'msw';

export const HANDLERS = [
  http.get('/review-workflows/workflows', () => {
    return HttpResponse.json({
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
    });
  }),
  http.get('/review-workflows/workflows/:id', () =>
    HttpResponse.json({
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
  ),
  http.get('/review-workflows/content-manager/collection-types/:contentType/stages', () =>
    HttpResponse.json({
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
  ),
  http.get('/review-workflows/content-manager/single-types/:contentType/stages', () =>
    HttpResponse.json({
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
  ),
  http.put('/review-workflows/content-manager/collection-types/:contentType/:id/assignee', () => {
    return new HttpResponse(null, {
      status: 200,
    });
  }),
  http.get('/review-workflows/content-manager/:collectionType/:contentType/:id/stages', () =>
    HttpResponse.json({
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
  ),
  http.get('/content-manager/content-types', () => {
    return HttpResponse.json({
      data: [
        {
          uid: 'uid1',
          isDisplayed: true,
          kind: 'collectionType',
          info: {
            displayName: 'Collection CT 1',
          },
        },
        {
          uid: 'uid2',
          isDisplayed: true,
          kind: 'collectionType',
          info: {
            displayName: 'Collection CT 2',
          },
        },
        {
          uid: 'single-uid1',
          kind: 'singleType',
          isDisplayed: true,
          info: {
            displayName: 'Single CT 1',
          },
        },
        {
          uid: 'single-uid2',
          isDisplayed: true,
          kind: 'singleType',
          info: {
            displayName: 'Single CT 2',
          },
        },
      ],
    });
  }),
];
