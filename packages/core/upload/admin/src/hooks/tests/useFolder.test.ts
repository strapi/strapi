import { renderHook, screen, server, waitFor } from '@tests/utils';
import { rest } from 'msw';

import { useFolder } from '../useFolder';

describe('useFolder', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('fetches data from the right URL if no query param was set', async () => {
    const { result } = renderHook(() => useFolder(1));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toMatchInlineSnapshot(`
      {
        "children": {
          "count": 2,
        },
        "createdAt": "2023-06-26T12:48:54.054Z",
        "files": {
          "count": 0,
        },
        "id": 1,
        "name": "test",
        "parent": null,
        "path": "/1",
        "pathId": 1,
        "updatedAt": "2023-06-26T12:48:54.054Z",
      }
    `);
  });

  test('it does not fetch, if enabled is set to false', async () => {
    const { result } = renderHook(() => useFolder(1, { enabled: false }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toBe(undefined);
  });

  test('calls toggleNotification in case of error', async () => {
    const originalConsoleError = console.error;
    console.error = jest.fn();

    server.use(rest.get('/upload/folders/:id', (req, res, ctx) => res(ctx.status(500))));

    const { result } = renderHook(() => useFolder(1));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(screen.getByText('Not found')).toBeInTheDocument();

    console.error = originalConsoleError;
    server.restoreHandlers();
  });
});
