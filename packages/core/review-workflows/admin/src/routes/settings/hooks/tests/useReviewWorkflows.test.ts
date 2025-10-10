import { renderHook, waitFor } from '@tests/utils';

import { useReviewWorkflows } from '../useReviewWorkflows';

describe('useReviewWorkflows', () => {
  it('fetches many workflows', async () => {
    const { result } = renderHook(() => useReviewWorkflows());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.workflows).toEqual([
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
    ]);
  });

  it.todo('creates a workflow');

  it.todo('updates a workflow');

  it.todo('deletes a workflow');

  it.todo('handles errors');
});
