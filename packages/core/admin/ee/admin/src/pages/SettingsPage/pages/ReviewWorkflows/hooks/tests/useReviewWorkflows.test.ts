import { renderHook, waitFor } from '@tests/utils';

import { useReviewWorkflows } from '../useReviewWorkflows';

describe('useReviewWorkflows', () => {
  test('fetches many workflows', async () => {
    const { result } = renderHook(() => useReviewWorkflows());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.workflows).toMatchInlineSnapshot(`
      [
        {
          "id": 1,
          "stages": [
            {
              "color": "#FFFFFF",
              "id": 1,
              "name": "To Review",
            },
          ],
        },
      ]
    `);
  });

  test('fetches one workflow', async () => {
    const { result } = renderHook(() => useReviewWorkflows({ id: 1 }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.workflows).toMatchInlineSnapshot(`
      [
        {
          "id": 1,
          "stages": [
            {
              "color": "#FFFFFF",
              "id": 1,
              "name": "To Review",
            },
          ],
        },
      ]
    `);
  });
});
