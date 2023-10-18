import { renderHook, waitFor } from '@tests/utils';

import { useReviewWorkflowsStages } from '../useReviewWorkflowsStages';

const setup = (...args) => renderHook(() => useReviewWorkflowsStages(...args));

describe('useReviewWorkflowsStages', () => {
  test('fetches stages for collection-types', async () => {
    const { result } = setup({
      id: 1,
      layout: {
        uid: 'api::collection.collection',
        kind: 'collectionType',
      },
    });

    await waitFor(() => expect(result.current.stages).toStrictEqual([]));
    await waitFor(() => expect(result.current.meta).toStrictEqual({}));

    await waitFor(() => result.current.isLoading === false);

    expect(result.current.stages).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 1,
        }),
      ])
    );

    expect(result.current.meta).toStrictEqual(
      expect.objectContaining({
        workflowCount: expect.any(Number),
      })
    );
  });

  test('fetches stages for single-types', async () => {
    const { result } = setup({
      id: 1,
      layout: {
        uid: 'api::single.single',
        kind: 'singleType',
      },
    });

    await waitFor(() => expect(result.current.stages).toStrictEqual([]));
    await waitFor(() => expect(result.current.meta).toStrictEqual({}));

    await waitFor(() => result.current.isLoading === false);

    expect(result.current.stages).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 1,
        }),
      ])
    );

    expect(result.current.meta).toStrictEqual(
      expect.objectContaining({
        workflowCount: expect.any(Number),
      })
    );
  });
});
