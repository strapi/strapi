import { errors } from '@strapi/utils';
import { renderHook, screen, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { mockData } from '../../../tests/mockData';
import { useDocumentActions } from '../useDocumentActions';

jest.mock('@strapi/admin/strapi-admin/ee', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin/ee'),
  useGetAiFeatureConfigQuery: () => ({ data: undefined }),
  useAIAvailability: () => false,
}));

describe('useDocumentActions', () => {
  it('should return an object with the correct methods', async () => {
    const { result } = renderHook(() => useDocumentActions());

    await waitFor(() => {
      expect(result.current).toEqual({
        autoClone: expect.any(Function),
        publishMany: expect.any(Function),
        clone: expect.any(Function),
        create: expect.any(Function),
        discard: expect.any(Function),
        delete: expect.any(Function),
        deleteMany: expect.any(Function),
        getDocument: expect.any(Function),
        publish: expect.any(Function),
        update: expect.any(Function),
        unpublish: expect.any(Function),
        unpublishMany: expect.any(Function),
        isLoading: expect.any(Boolean),
      });
    });
  });

  describe('clone', () => {
    it('should return the cloned document when successful', async () => {
      const { result } = renderHook(() => useDocumentActions());

      let response;

      await waitFor(async () => {
        const res = await result.current.clone(
          {
            model: mockData.contentManager.contentType,
            documentId: '12345',
          },
          {
            title: 'test',
            content: 'the brown fox jumps over the lazy dog',
          }
        );

        response = res;
      });

      expect(response).toEqual({
        data: {
          content: 'the brown fox jumps over the lazy dog',
          documentId: '67890',
          id: 2,
          title: 'test',
        },
      });
    });

    it('should return the errors when unsuccessful', async () => {
      server.use(
        http.post('/content-manager/:collectionType/:uid/clone/:id', () => {
          return HttpResponse.json(
            {
              error: new errors.ApplicationError("Couldn't clone entry."),
            },
            { status: 500 }
          );
        })
      );

      const { result } = renderHook(() => useDocumentActions());

      let response;

      await waitFor(async () => {
        const res = await result.current.clone(
          {
            model: mockData.contentManager.contentType,
            documentId: '12345',
          },
          {
            documentId: '12345',
            title: 'test',
            content: 'the brown fox jumps over the lazy dog',
          }
        );

        response = res;
      });

      expect(response).toEqual({
        error: {
          details: {},
          message: "Couldn't clone entry.",
          name: 'ApplicationError',
        },
      });

      await screen.findByText("Couldn't clone entry.");
    });
  });

  describe('create', () => {
    it('should return the created document when successful', async () => {
      const { result } = renderHook(() => useDocumentActions());

      let response;

      await waitFor(async () => {
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

      expect(response).toEqual({
        data: {
          content: 'the brown fox jumps over the lazy dog',
          documentId: '12345',
          id: 1,
          title: 'test',
        },
      });

      // Wait for notification to prevent act warnings from Sonner
      await screen.findByText('Saved document');
    });

    it('should return the errors when unsuccessful', async () => {
      server.use(
        http.post('/content-manager/:collectionType/:uid', () => {
          return HttpResponse.json(
            {
              error: new errors.ApplicationError("Couldn't create entry."),
            },
            { status: 500 }
          );
        })
      );

      const { result } = renderHook(() => useDocumentActions());

      let response;

      await waitFor(async () => {
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

      expect(response).toEqual({
        error: {
          details: {},
          message: "Couldn't create entry.",
          name: 'ApplicationError',
        },
      });

      await screen.findByText("Couldn't create entry.");
    });
  });

  describe('delete', () => {
    it('should return the deleted document when successful', async () => {
      const { result } = renderHook(() => useDocumentActions());

      let response;

      await waitFor(async () => {
        const res = await result.current.delete({
          collectionType: 'collection-types',
          model: mockData.contentManager.contentType,
          documentId: '12345',
        });

        response = res;
      });

      expect(response).toEqual({
        documentId: '12345',
        id: 1,
        title: 'test',
      });

      // Wait for notification to prevent act warnings from Sonner
      await screen.findByText('Deleted document');
    });

    it('should return the errors when unsuccessful', async () => {
      server.use(
        http.delete('/content-manager/:collectionType/:uid/:id', () => {
          return HttpResponse.json(
            {
              error: new errors.ApplicationError("Couldn't delete entry."),
            },
            { status: 500 }
          );
        })
      );

      const { result } = renderHook(() => useDocumentActions());

      let response;

      await waitFor(async () => {
        const res = await result.current.delete({
          collectionType: 'collection-types',
          model: mockData.contentManager.contentType,
          documentId: '12345',
        });

        response = res;
      });

      expect(response).toEqual({
        error: {
          details: {},
          message: "Couldn't delete entry.",
          name: 'ApplicationError',
        },
      });

      await screen.findByText("Couldn't delete entry.");
    });
  });

  describe('bulk delete', () => {
    it('should return the deleted documents when successful', async () => {
      const { result } = renderHook(() => useDocumentActions());

      let response;

      await waitFor(async () => {
        const res = await result.current.deleteMany({
          model: mockData.contentManager.contentType,
          documentIds: ['12345', '6789'],
          params: {
            locale: 'en',
          },
        });

        response = res;
      });

      expect(response).toEqual({
        count: 2,
      });

      // Wait for notification to prevent act warnings from Sonner
      await screen.findByText('Successfully deleted.');
    });

    it('should return the errors when unsuccessful', async () => {
      server.use(
        http.post('/content-manager/collection-types/:uid/actions/bulkDelete', () => {
          return HttpResponse.json(
            {
              error: new errors.ApplicationError("Couldn't delete entries."),
            },
            { status: 500 }
          );
        })
      );

      const { result } = renderHook(() => useDocumentActions());

      let response;

      await waitFor(async () => {
        const res = await result.current.deleteMany({
          model: mockData.contentManager.contentType,
          documentIds: ['12345', '6789'],
          params: { locale: 'en' },
        });

        response = res;
      });

      expect(response).toEqual({
        error: {
          details: {},
          message: "Couldn't delete entries.",
          name: 'ApplicationError',
        },
      });

      await screen.findByText("Couldn't delete entries.");
    });
  });

  describe('discard', () => {
    it('should return the discarded document when successful', async () => {
      const { result } = renderHook(() => useDocumentActions());

      let response;

      await waitFor(async () => {
        const res = await result.current.discard({
          collectionType: 'collection-types',
          model: mockData.contentManager.contentType,
          documentId: '12345',
        });

        response = res;
      });

      expect(response).toEqual({
        documentId: '12345',
        id: 1,
        title: 'test',
      });

      // Wait for notification to prevent act warnings from Sonner
      await screen.findByText('Changes discarded');
    });

    it('should return the errors when unsuccessful', async () => {
      server.use(
        http.post('/content-manager/:collectionType/:uid/:id/actions/discard', () => {
          return HttpResponse.json(
            {
              error: new errors.ApplicationError("Couldn't discard entry."),
            },
            { status: 500 }
          );
        })
      );

      const { result } = renderHook(() => useDocumentActions());

      let response;

      await waitFor(async () => {
        const res = await result.current.discard({
          collectionType: 'collection-types',
          model: mockData.contentManager.contentType,
          documentId: '12345',
        });

        response = res;
      });

      expect(response).toEqual({
        error: {
          details: {},
          message: "Couldn't discard entry.",
          name: 'ApplicationError',
        },
      });

      await screen.findByText("Couldn't discard entry.");
    });
  });

  describe('delete', () => {
    it('should return the deleted document when successful', async () => {
      const { result } = renderHook(() => useDocumentActions());

      let response;

      await waitFor(async () => {
        const res = await result.current.delete({
          collectionType: 'collection-types',
          model: mockData.contentManager.contentType,
          documentId: '12345',
        });

        response = res;
      });

      expect(response).toEqual({
        documentId: '12345',
        id: 1,
        title: 'test',
      });

      // Wait for notification to prevent act warnings from Sonner
      await screen.findByText('Deleted document');
    });

    it('should return the errors when unsuccessful', async () => {
      server.use(
        http.delete('/content-manager/:collectionType/:uid/:id', () => {
          return HttpResponse.json(
            {
              error: new errors.ApplicationError("Couldn't delete entry."),
            },
            { status: 500 }
          );
        })
      );

      const { result } = renderHook(() => useDocumentActions());

      let response;

      await waitFor(async () => {
        const res = await result.current.delete({
          collectionType: 'collection-types',
          model: mockData.contentManager.contentType,
          documentId: '12345',
        });

        response = res;
      });

      expect(response).toEqual({
        error: {
          details: {},
          message: "Couldn't delete entry.",
          name: 'ApplicationError',
        },
      });

      await screen.findByText("Couldn't delete entry.");
    });
  });

  describe('publish', () => {
    it('should return the published document when successful', async () => {
      const { result } = renderHook(() => useDocumentActions());

      let response;

      await waitFor(async () => {
        const res = await result.current.publish(
          {
            collectionType: 'collection-types',
            model: mockData.contentManager.contentType,
            documentId: '12345',
          },
          {
            title: 'Entry 1',
          }
        );

        response = res;
      });

      expect(response).toEqual({
        documentId: '12345',
        id: 1,
        publishedAt: '2024-01-23T16:23:38.948Z',
        title: 'test',
      });

      // Wait for notification to prevent act warnings from Sonner
      await screen.findByText('Published document');
    });

    it('sends baseVersion with an existing draft publish', async () => {
      let requestBody: unknown;
      server.use(
        http.post(
          '/content-manager/:collectionType/:uid/:id/actions/publish',
          async ({ request }) => {
            requestBody = await request.json();
            return HttpResponse.json({
              documentId: '12345',
              id: 1,
              title: 'test',
              publishedAt: '2024-01-23T16:23:38.948Z',
            });
          }
        )
      );
      const { result } = renderHook(() => useDocumentActions());

      await result.current.publish(
        {
          collectionType: 'collection-types',
          model: mockData.contentManager.contentType,
          documentId: '12345',
          baseVersion: '2026-01-01T00:00:00.000Z',
        },
        { title: 'Entry 1' }
      );

      expect(requestBody).toEqual({
        title: 'Entry 1',
        baseVersion: '2026-01-01T00:00:00.000Z',
      });
    });

    it('should return the errors when unsuccessful', async () => {
      server.use(
        http.post('/content-manager/:collectionType/:uid/:id/actions/publish', () => {
          return HttpResponse.json(
            {
              error: new errors.ApplicationError("Couldn't publish entry."),
            },
            { status: 500 }
          );
        })
      );

      const { result } = renderHook(() => useDocumentActions());

      let response;

      await waitFor(async () => {
        const res = await result.current.publish(
          {
            collectionType: 'collection-types',
            model: mockData.contentManager.contentType,
            documentId: '12345',
          },
          {
            title: 'Entry 1',
          }
        );

        response = res;
      });

      expect(response).toEqual({
        error: {
          details: {},
          message: "Couldn't publish entry.",
          name: 'ApplicationError',
        },
      });

      await screen.findByText("Couldn't publish entry.");
    });
  });

  describe('update', () => {
    it('should return the updated document when successful', async () => {
      const { result } = renderHook(() => useDocumentActions());

      let response;

      await waitFor(async () => {
        const res = await result.current.update(
          {
            collectionType: 'collection-types',
            model: mockData.contentManager.contentType,
            documentId: '12345',
          },
          {
            documentId: '12345',
            content: 'the brown fox jumps over the lazy dog',
          }
        );

        response = res;
      });

      expect(response).toEqual({
        data: {
          content: 'the brown fox jumps over the lazy dog',
          createdAt: '',
          documentId: '12345',
          id: 1,
          name: 'Entry 1',
          publishedAt: '',
          updatedAt: '',
        },
      });

      // Wait for notification to prevent act warnings from Sonner
      await screen.findByText('Saved document');
    });

    it('sends baseVersion with the update', async () => {
      let requestBody: Record<string, unknown> | undefined;

      server.use(
        http.put('/content-manager/:collectionType/:uid/:id', async ({ request }) => {
          requestBody = (await request.json()) as Record<string, unknown>;

          return HttpResponse.json({
            data: {
              documentId: '12345',
              id: 1,
              title: 'Updated',
            },
          });
        })
      );

      const { result } = renderHook(() => useDocumentActions());

      await result.current.update(
        {
          collectionType: 'collection-types',
          model: mockData.contentManager.contentType,
          documentId: '12345',
          baseVersion: '2026-01-01T00:00:00.000Z',
        },
        { title: 'Updated' }
      );

      expect(requestBody).toMatchObject({
        title: 'Updated',
        baseVersion: '2026-01-01T00:00:00.000Z',
      });
    });

    it('returns a version conflict without showing a generic error notification', async () => {
      server.use(
        http.put('/content-manager/:collectionType/:uid/:id', () => {
          return HttpResponse.json(
            {
              error: {
                status: 409,
                name: 'ConflictError',
                message: 'The document has changed since it was loaded',
                details: {},
              },
            },
            { status: 409 }
          );
        })
      );

      const { result } = renderHook(() => useDocumentActions());

      const response = await result.current.update(
        {
          collectionType: 'collection-types',
          model: mockData.contentManager.contentType,
          documentId: '12345',
          baseVersion: '2026-01-01T00:00:00.000Z',
        },
        { title: 'Updated' }
      );

      expect(response).toEqual({
        error: {
          status: 409,
          name: 'ConflictError',
          message: 'The document has changed since it was loaded',
          details: {},
        },
      });
      expect(
        screen.queryByText('The document has changed since it was loaded')
      ).not.toBeInTheDocument();
    });

    it('does not refetch the document after a version conflict', async () => {
      const getDocument = jest.fn();

      server.use(
        http.put('/content-manager/:collectionType/:uid/:id', () => {
          return HttpResponse.json(
            {
              error: {
                status: 409,
                name: 'ConflictError',
                message: 'The document has changed since it was loaded',
                details: {},
              },
            },
            { status: 409 }
          );
        }),
        http.get('/content-manager/:collectionType/:uid/:id', () => {
          getDocument();

          return HttpResponse.json({ data: { documentId: '12345' } });
        })
      );

      const { result } = renderHook(() => useDocumentActions());

      await result.current.update(
        {
          collectionType: 'collection-types',
          model: mockData.contentManager.contentType,
          documentId: '12345',
          baseVersion: '2026-01-01T00:00:00.000Z',
        },
        { title: 'Updated' }
      );

      await new Promise((resolve) => {
        setTimeout(resolve, 50);
      });

      expect(getDocument).not.toHaveBeenCalled();
    });

    it('should return the errors when unsuccessful', async () => {
      server.use(
        http.put('/content-manager/:collectionType/:uid/:id', () => {
          return HttpResponse.json(
            {
              error: new errors.ApplicationError("Couldn't update entry."),
            },
            { status: 500 }
          );
        })
      );

      const { result } = renderHook(() => useDocumentActions());

      let response;

      await waitFor(async () => {
        const res = await result.current.update(
          {
            collectionType: 'collection-types',
            model: mockData.contentManager.contentType,
            documentId: '12345',
          },
          {
            documentId: '12345',
            content: 'the brown fox jumps over the lazy dog',
          }
        );

        response = res;
      });

      expect(response).toEqual({
        error: {
          details: {},
          message: "Couldn't update entry.",
          name: 'ApplicationError',
        },
      });

      await screen.findByText("Couldn't update entry.");
    });
  });

  describe('unpublish', () => {
    it('should return the unpublished document when successful', async () => {
      const { result } = renderHook(() => useDocumentActions());

      let response;

      await waitFor(async () => {
        const res = await result.current.unpublish({
          collectionType: 'collection-types',
          model: mockData.contentManager.contentType,
          documentId: '12345',
        });

        response = res;
      });

      expect(response).toEqual({
        documentId: '12345',
        id: 1,
        publishedAt: null,
        title: 'test',
      });

      // Wait for notification to prevent act warnings from Sonner
      await screen.findByText('Unpublished document');
    });

    it('should return the errors when unsuccessful', async () => {
      server.use(
        http.post('/content-manager/:collectionType/:uid/:id/actions/unpublish', () => {
          return HttpResponse.json(
            {
              error: new errors.ApplicationError("Couldn't unpublish entry."),
            },
            { status: 500 }
          );
        })
      );

      const { result } = renderHook(() => useDocumentActions());

      let response;

      await waitFor(async () => {
        const res = await result.current.unpublish({
          collectionType: 'collection-types',
          model: mockData.contentManager.contentType,
          documentId: '12345',
        });

        response = res;
      });

      expect(response).toEqual({
        error: {
          details: {},
          message: "Couldn't unpublish entry.",
          name: 'ApplicationError',
        },
      });

      await screen.findByText("Couldn't unpublish entry.");
    });
  });

  describe('bulk unpublish', () => {
    it('should return the unpublished document when successful', async () => {
      const { result } = renderHook(() => useDocumentActions());

      let response;

      await waitFor(async () => {
        const res = await result.current.unpublishMany({
          model: mockData.contentManager.contentType,
          documentIds: ['12345', '6789'],
        });

        response = res;
      });

      expect(response).toEqual({
        count: 2,
      });

      // Wait for notification to prevent act warnings from Sonner
      await screen.findByText('Successfully unpublished.');
    });

    it('should return the errors when unsuccessful', async () => {
      server.use(
        http.post('/content-manager/collection-types/:uid/actions/bulkUnpublish', () => {
          return HttpResponse.json(
            {
              error: new errors.ApplicationError("Couldn't unpublish entries."),
            },
            { status: 500 }
          );
        })
      );

      const { result } = renderHook(() => useDocumentActions());

      let response;

      await waitFor(async () => {
        const res = await result.current.unpublishMany({
          model: mockData.contentManager.contentType,
          documentIds: ['12345', '6789'],
        });

        response = res;
      });

      expect(response).toEqual({
        error: {
          name: 'ApplicationError',
          message: "Couldn't unpublish entries.",
          details: {},
        },
      });

      await screen.findByText("Couldn't unpublish entries.");
    });
  });
});
