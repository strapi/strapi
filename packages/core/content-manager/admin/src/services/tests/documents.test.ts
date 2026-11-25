import { act, renderHook, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';
import { useStore } from 'react-redux';

import { useGetDocumentQuery, useUpdateDocumentMutation } from '../documents';

const documentArg = {
  collectionType: 'collection-types',
  model: 'api::article.article',
  documentId: 'doc-1',
  params: {},
};

const documentResponse = {
  data: {
    id: 1,
    documentId: 'doc-1',
    title: 'Saved title',
    locale: 'en',
    status: 'draft',
  },
  meta: { availableStatus: [], availableLocales: [] },
};

describe('updateDocument', () => {
  it('does not copy the submitted data into the getDocument cache before the server accepts it', async () => {
    server.use(
      http.get('/content-manager/collection-types/:model/:documentId', () =>
        HttpResponse.json(documentResponse)
      )
    );

    let releaseResponse = () => {};
    const responseGate = new Promise<void>((resolve) => {
      releaseResponse = resolve;
    });
    let markRequestStarted = () => {};
    const requestStarted = new Promise<void>((resolve) => {
      markRequestStarted = resolve;
    });

    server.use(
      http.put('/content-manager/collection-types/:model/:documentId', async () => {
        markRequestStarted();
        await responseGate;

        return HttpResponse.json(
          {
            data: null,
            error: {
              status: 400,
              name: 'ValidationError',
              message: 'Slug is already used',
            },
          },
          { status: 400 }
        );
      })
    );

    const { result } = renderHook(() => ({
      document: useGetDocumentQuery(documentArg),
      update: useUpdateDocumentMutation(),
    }));

    await waitFor(() => expect(result.current.document.data?.data?.title).toBe('Saved title'));

    let mutation: Promise<unknown> = Promise.resolve();

    act(() => {
      const [updateDocument] = result.current.update;
      mutation = updateDocument({ ...documentArg, data: { title: 'Edited title' } });
    });

    await requestStarted;

    /**
     * While the request is in flight the cache must still hold the saved document.
     * Patching it here is what made `Form` copy the optimistic values into its state
     * and lose the edits when the request failed.
     */
    expect(result.current.document.data?.data?.title).toBe('Saved title');

    releaseResponse();

    await act(async () => {
      await mutation;
    });

    await waitFor(() => expect(result.current.update[1].isError).toBe(true));
    expect(result.current.document.data?.data?.title).toBe('Saved title');
  });

  it('copies the saved data into the getDocument cache before the mutation resolves', async () => {
    let releaseRefetch = () => {};
    const refetchGate = new Promise<void>((resolve) => {
      releaseRefetch = resolve;
    });
    let getCount = 0;

    server.use(
      http.get('/content-manager/collection-types/:model/:documentId', async () => {
        getCount += 1;

        /**
         * The invalidation refetch starts as soon as the mutation succeeds. Hold it
         * so the assertion below reads the cache the patch produced instead of the
         * refetch response.
         */
        if (getCount > 1) {
          await refetchGate;
        }

        return HttpResponse.json(documentResponse);
      }),
      http.put('/content-manager/collection-types/:model/:documentId', () =>
        HttpResponse.json({
          data: { ...documentResponse.data, title: 'Edited title' },
          meta: documentResponse.meta,
        })
      )
    );

    const { result } = renderHook(() => ({
      document: useGetDocumentQuery(documentArg),
      update: useUpdateDocumentMutation(),
      store: useStore(),
    }));

    await waitFor(() => expect(result.current.document.data?.data?.title).toBe('Saved title'));

    let mutation: Promise<unknown> = Promise.resolve();

    act(() => {
      const [updateDocument] = result.current.update;
      mutation = updateDocument({ ...documentArg, data: { title: 'Edited title' } });
    });

    await act(async () => {
      await mutation;
    });

    /**
     * `UpdateAction` calls `resetForm(latestValues)` as soon as the mutation resolves,
     * and it reads this cache, so the new data has to be there by then. Reading the
     * store directly avoids waiting for the hook's next render.
     */
    const state = result.current.store.getState() as {
      adminApi: {
        queries: Record<
          string,
          { endpointName?: string; data?: typeof documentResponse }
        >;
      };
    };
    const cachedDocument = Object.values(state.adminApi.queries).find(
      (query) => query?.endpointName === 'getDocument'
    );

    expect(cachedDocument?.data?.data.title).toBe('Edited title');

    await act(async () => {
      releaseRefetch();
    });

    await waitFor(() => expect(result.current.document.data?.data?.title).toBe('Saved title'));
  });
});
