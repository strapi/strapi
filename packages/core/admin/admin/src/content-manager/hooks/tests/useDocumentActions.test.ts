import { errors } from '@strapi/utils';
import { act, renderHook, screen, server } from '@tests/utils';
import { rest } from 'msw';

import { mockData } from '../../../../tests/mockData';
import { useDocumentActions } from '../useDocumentActions';

describe('useDocumentActions', () => {
  it('should return an object with the correct methods', () => {
    const { result } = renderHook(() => useDocumentActions());

    expect(result.current).toEqual({
      clone: expect.any(Function),
      create: expect.any(Function),
      discard: expect.any(Function),
      delete: expect.any(Function),
      getDocument: expect.any(Function),
      publish: expect.any(Function),
      update: expect.any(Function),
      unpublish: expect.any(Function),
    });
  });

  describe('clone', () => {
    it('should return the cloned document when successful', async () => {
      const { result } = renderHook(() => useDocumentActions());

      let response;

      await act(async () => {
        const res = await result.current.clone(
          {
            model: mockData.contentManager.contentType,
            id: '12345',
          },
          {
            id: '12345',
            title: 'test',
            content: 'the brown fox jumps over the lazy dog',
          }
        );

        response = res;
      });

      expect(response).toMatchInlineSnapshot(`
        {
          "data": {
            "content": "the brown fox jumps over the lazy dog",
            "id": "67890",
            "title": "test",
          },
        }
      `);
    });

    it('should return the errors when unsuccessful', async () => {
      server.use(
        rest.post('/content-manager/:collectionType/:uid/clone/:id', (_, res, ctx) => {
          return res(
            ctx.status(500),
            ctx.json({
              error: new errors.ApplicationError("Couldn't clone entry."),
            })
          );
        })
      );

      const { result } = renderHook(() => useDocumentActions());

      let response;

      await act(async () => {
        const res = await result.current.clone(
          {
            model: mockData.contentManager.contentType,
            id: '12345',
          },
          {
            id: '12345',
            title: 'test',
            content: 'the brown fox jumps over the lazy dog',
          }
        );

        response = res;
      });

      expect(response).toMatchInlineSnapshot(`
        {
          "error": {
            "details": {},
            "message": "Couldn't clone entry.",
            "name": "ApplicationError",
          },
        }
      `);

      await screen.findByText("Couldn't clone entry.");
    });
  });

  describe('create', () => {
    it('should return the created document when successful', async () => {
      const { result } = renderHook(() => useDocumentActions());

      let response;

      await act(async () => {
        const res = await result.current.create(
          {
            model: mockData.contentManager.contentType,
          },
          {
            title: 'test',
            content: 'the brown fox jumps over the lazy dog',
          }
        );

        response = res;
      });

      expect(response).toMatchInlineSnapshot(`
          {
            "data": {
              "content": "the brown fox jumps over the lazy dog",
              "id": "12345",
              "title": "test",
            },
          }
        `);
    });

    it('should return the errors when unsuccessful', async () => {
      server.use(
        rest.post('/content-manager/:collectionType/:uid', (_, res, ctx) => {
          return res(
            ctx.status(500),
            ctx.json({
              error: new errors.ApplicationError("Couldn't create entry."),
            })
          );
        })
      );

      const { result } = renderHook(() => useDocumentActions());

      let response;

      await act(async () => {
        const res = await result.current.create(
          {
            model: mockData.contentManager.contentType,
          },
          {
            title: 'test',
            content: 'the brown fox jumps over the lazy dog',
          }
        );

        response = res;
      });

      expect(response).toMatchInlineSnapshot(`
            {
              "error": {
                "details": {},
                "message": "Couldn't create entry.",
                "name": "ApplicationError",
              },
            }
          `);

      await screen.findByText("Couldn't create entry.");
    });
  });

  describe('delete', () => {
    it('should return the deleted document when successful', async () => {
      const { result } = renderHook(() => useDocumentActions());

      let response;

      await act(async () => {
        const res = await result.current.delete({
          collectionType: 'collection-types',
          model: mockData.contentManager.contentType,
          id: '12345',
        });

        response = res;
      });

      expect(response).toMatchInlineSnapshot(`
        {
          "id": "12345",
          "title": "test",
        }
      `);
    });

    it('should return the errors when unsuccessful', async () => {
      server.use(
        rest.delete('/content-manager/:collectionType/:uid/:id', (_, res, ctx) => {
          return res(
            ctx.status(500),
            ctx.json({
              error: new errors.ApplicationError("Couldn't delete entry."),
            })
          );
        })
      );

      const { result } = renderHook(() => useDocumentActions());

      let response;

      await act(async () => {
        const res = await result.current.delete({
          collectionType: 'collection-types',
          model: mockData.contentManager.contentType,
          id: '12345',
        });

        response = res;
      });

      expect(response).toMatchInlineSnapshot(`
                {
                  "error": {
                    "details": {},
                    "message": "Couldn't delete entry.",
                    "name": "ApplicationError",
                  },
                }
              `);

      await screen.findByText("Couldn't delete entry.");
    });
  });

  describe('discard', () => {
    it('should return the discarded document when successful', async () => {
      const { result } = renderHook(() => useDocumentActions());

      let response;

      await act(async () => {
        const res = await result.current.discard({
          collectionType: 'collection-types',
          model: mockData.contentManager.contentType,
          id: '12345',
        });

        response = res;
      });

      expect(response).toMatchInlineSnapshot(`
        {
          "id": "12345",
          "title": "test",
        }
      `);
    });

    it('should return the errors when unsuccessful', async () => {
      server.use(
        rest.post('/content-manager/:collectionType/:uid/:id/actions/discard', (_, res, ctx) => {
          return res(
            ctx.status(500),
            ctx.json({
              error: new errors.ApplicationError("Couldn't discard entry."),
            })
          );
        })
      );

      const { result } = renderHook(() => useDocumentActions());

      let response;

      await act(async () => {
        const res = await result.current.discard({
          collectionType: 'collection-types',
          model: mockData.contentManager.contentType,
          id: '12345',
        });

        response = res;
      });

      expect(response).toMatchInlineSnapshot(`
        {
          "error": {
            "details": {},
            "message": "Couldn't discard entry.",
            "name": "ApplicationError",
          },
        }
      `);

      await screen.findByText("Couldn't discard entry.");
    });
  });

  describe('delete', () => {
    it('should return the deleted document when successful', async () => {
      const { result } = renderHook(() => useDocumentActions());

      let response;

      await act(async () => {
        const res = await result.current.delete({
          collectionType: 'collection-types',
          model: mockData.contentManager.contentType,
          id: '12345',
        });

        response = res;
      });

      expect(response).toMatchInlineSnapshot(`
        {
          "id": "12345",
          "title": "test",
        }
      `);
    });

    it('should return the errors when unsuccessful', async () => {
      server.use(
        rest.delete('/content-manager/:collectionType/:uid/:id', (_, res, ctx) => {
          return res(
            ctx.status(500),
            ctx.json({
              error: new errors.ApplicationError("Couldn't delete entry."),
            })
          );
        })
      );

      const { result } = renderHook(() => useDocumentActions());

      let response;

      await act(async () => {
        const res = await result.current.delete({
          collectionType: 'collection-types',
          model: mockData.contentManager.contentType,
          id: '12345',
        });

        response = res;
      });

      expect(response).toMatchInlineSnapshot(`
                {
                  "error": {
                    "details": {},
                    "message": "Couldn't delete entry.",
                    "name": "ApplicationError",
                  },
                }
              `);

      await screen.findByText("Couldn't delete entry.");
    });
  });

  describe('publish', () => {
    it('should return the published document when successful', async () => {
      const { result } = renderHook(() => useDocumentActions());

      let response;

      await act(async () => {
        const res = await result.current.publish(
          {
            collectionType: 'collection-types',
            model: mockData.contentManager.contentType,
            id: '12345',
          },
          {
            title: 'Entry 1',
          }
        );

        response = res;
      });

      expect(response).toMatchInlineSnapshot(`
        {
          "id": "12345",
          "publishedAt": "2024-01-23T16:23:38.948Z",
          "title": "test",
        }
      `);
    });

    it('should return the errors when unsuccessful', async () => {
      server.use(
        rest.post('/content-manager/:collectionType/:uid/:id/actions/publish', (_, res, ctx) => {
          return res(
            ctx.status(500),
            ctx.json({
              error: new errors.ApplicationError("Couldn't publish entry."),
            })
          );
        })
      );

      const { result } = renderHook(() => useDocumentActions());

      let response;

      await act(async () => {
        const res = await result.current.publish(
          {
            collectionType: 'collection-types',
            model: mockData.contentManager.contentType,
            id: '12345',
          },
          {
            title: 'Entry 1',
          }
        );

        response = res;
      });

      expect(response).toMatchInlineSnapshot(`
        {
          "error": {
            "details": {},
            "message": "Couldn't publish entry.",
            "name": "ApplicationError",
          },
        }
      `);

      await screen.findByText("Couldn't publish entry.");
    });
  });

  describe('update', () => {
    it('should return the updated document when successful', async () => {
      const { result } = renderHook(() => useDocumentActions());

      let response;

      await act(async () => {
        const res = await result.current.update(
          {
            collectionType: 'collection-types',
            model: mockData.contentManager.contentType,
            id: '12345',
          },
          {
            id: '12345',
            content: 'the brown fox jumps over the lazy dog',
          }
        );

        response = res;
      });

      expect(response).toMatchInlineSnapshot(`
        {
          "data": {
            "content": "the brown fox jumps over the lazy dog",
            "createdAt": "",
            "id": "12345",
            "name": "Entry 1",
            "publishedAt": "",
            "updatedAt": "",
          },
        }
      `);
    });

    it('should return the errors when unsuccessful', async () => {
      server.use(
        rest.put('/content-manager/:collectionType/:uid/:id', (_, res, ctx) => {
          return res(
            ctx.status(500),
            ctx.json({
              error: new errors.ApplicationError("Couldn't update entry."),
            })
          );
        })
      );

      const { result } = renderHook(() => useDocumentActions());

      let response;

      await act(async () => {
        const res = await result.current.update(
          {
            collectionType: 'collection-types',
            model: mockData.contentManager.contentType,
            id: '12345',
          },
          {
            id: '12345',
            content: 'the brown fox jumps over the lazy dog',
          }
        );

        response = res;
      });

      expect(response).toMatchInlineSnapshot(`
        {
          "error": {
            "details": {},
            "message": "Couldn't update entry.",
            "name": "ApplicationError",
          },
        }
      `);

      await screen.findByText("Couldn't update entry.");
    });
  });

  describe('unpublish', () => {
    it('should return the unpublished document when successful', async () => {
      const { result } = renderHook(() => useDocumentActions());

      let response;

      await act(async () => {
        const res = await result.current.unpublish({
          collectionType: 'collection-types',
          model: mockData.contentManager.contentType,
          id: '12345',
        });

        response = res;
      });

      expect(response).toMatchInlineSnapshot(`
        {
          "id": "12345",
          "publishedAt": null,
          "title": "test",
        }
      `);
    });

    it('should return the errors when unsuccessful', async () => {
      server.use(
        rest.post('/content-manager/:collectionType/:uid/:id/actions/unpublish', (_, res, ctx) => {
          return res(
            ctx.status(500),
            ctx.json({
              error: new errors.ApplicationError("Couldn't unpublish entry."),
            })
          );
        })
      );

      const { result } = renderHook(() => useDocumentActions());

      let response;

      await act(async () => {
        const res = await result.current.unpublish({
          collectionType: 'collection-types',
          model: mockData.contentManager.contentType,
          id: '12345',
        });

        response = res;
      });

      expect(response).toMatchInlineSnapshot(`
        {
          "error": {
            "details": {},
            "message": "Couldn't unpublish entry.",
            "name": "ApplicationError",
          },
        }
      `);

      await screen.findByText("Couldn't unpublish entry.");
    });
  });
});
