import { act, renderHook, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

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
});
