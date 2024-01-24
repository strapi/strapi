import { errors } from '@strapi/utils';
import { renderHook, screen, server, waitFor } from '@tests/utils';
import { rest } from 'msw';

import { mockData } from '../../../../tests/mockData';
import { useDocumentLayout } from '../useDocumentLayout';

describe('useDocumentLayout', () => {
  it('should return a correctly formatted edit layout after loading', async () => {
    const { result } = renderHook(() => useDocumentLayout(mockData.contentManager.contentType));

    expect(result.current.edit).toMatchInlineSnapshot(`
      {
        "components": {},
        "schema": [],
      }
    `);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.edit.components).toMatchInlineSnapshot(`
      {
        "blog.test-como": [
          [
            {
              "disabled": false,
              "hint": "",
              "label": "name",
              "name": "name",
              "placeholder": "",
              "required": false,
              "size": 6,
              "type": "string",
              "unique": false,
              "visible": true,
            },
          ],
        ],
      }
    `);

    expect(result.current.edit.schema).toMatchInlineSnapshot(`
      [
        [
          [
            {
              "disabled": false,
              "hint": "",
              "label": "slug",
              "name": "slug",
              "placeholder": "",
              "required": false,
              "size": 6,
              "type": "uid",
              "unique": false,
              "visible": true,
            },
          ],
          [
            {
              "disabled": false,
              "hint": "",
              "label": "repeat_req_min",
              "name": "repeat_req_min",
              "placeholder": "",
              "required": false,
              "size": 12,
              "type": "component",
              "unique": false,
              "visible": true,
            },
          ],
          [
            {
              "disabled": false,
              "hint": "",
              "label": "json",
              "name": "json",
              "placeholder": "",
              "required": false,
              "size": 12,
              "type": "json",
              "unique": false,
              "visible": true,
            },
          ],
        ],
      ]
    `);
  });

  it('should display an error should the configuration fail to fetch', async () => {
    server.use(
      rest.get('/content-manager/:collectionType/:model/configuration', (req, res, ctx) => {
        return res(
          ctx.status(500),
          ctx.json({
            error: new errors.ApplicationError('Error fetching configuration'),
          })
        );
      })
    );

    const { result } = renderHook(() => useDocumentLayout(mockData.contentManager.contentType));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await screen.findByText('Error fetching configuration');
  });
});
