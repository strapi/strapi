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
        "id": 1,
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
  });
});
