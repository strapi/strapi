import { renderHook, waitFor } from '@tests/utils';

import { useReviewWorkflowsStages } from '../useReviewWorkflowsStages';

const setup = (...args: Parameters<typeof useReviewWorkflowsStages>) =>
  renderHook(() => useReviewWorkflowsStages(...args));

describe('useReviewWorkflowsStages', () => {
  test('fetches stages for collection-types', async () => {
    const { result } = setup({
      id: 1,
      // @ts-expect-error – this is all we use, maybe we should just pass that instead to be better?
      layout: {
        uid: 'api::collection.collection',
        kind: 'collectionType',
      },
    });

    await waitFor(() => expect(result.current.stages).toStrictEqual([]));
    await waitFor(() => expect(result.current.meta).toStrictEqual({ workflowCount: 0 }));

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
      // @ts-expect-error – this is all we use, maybe we should just pass that instead to be better?
      layout: {
        uid: 'api::single.single',
        kind: 'singleType',
      },
    });

    await waitFor(() => expect(result.current.stages).toStrictEqual([]));
    await waitFor(() => expect(result.current.meta).toStrictEqual({ workflowCount: 0 }));

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
