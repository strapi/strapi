import { act, renderHook, waitFor, screen, server } from '@tests/utils';
import { rest } from 'msw';

import { useConfig } from '../useConfig';

describe('useConfig', () => {
  describe('query', () => {
    test('does call the get endpoint', async () => {
      const { result } = renderHook(() => useConfig());

      await waitFor(() => expect(result.current.config.isLoading).toBe(false));

      expect(result.current.config.data).toMatchInlineSnapshot(`
        {
          "pageSize": 20,
          "sort": "updatedAt:DESC",
        }
      `);
    });

    test('should still return an object even if the server returns a falsey value', async () => {
      server.use(
        rest.get('/upload/configuration', (req, res, ctx) => {
          return res(
            ctx.json({
              data: null,
            })
          );
        })
      );

      const { result } = renderHook(() => useConfig());

      await waitFor(() => expect(result.current.config.data).toEqual({}));

      server.restoreHandlers();
    });

    test('calls toggleNotification in case of error', async () => {
      const originalConsoleError = console.error;
      console.error = jest.fn();
      server.use(
        rest.get('/upload/configuration', (req, res, ctx) => {
          return res(ctx.status(500));
        })
      );

      renderHook(() => useConfig());

      await waitFor(() => expect(screen.getByText('notification.error')).toBeInTheDocument());

      console.error = originalConsoleError;
      server.restoreHandlers();
    });
  });

  describe('mutation', () => {
    test('does call the proper mutation endpoint', async () => {
      const { result } = renderHook(() => useConfig());

      act(() => {
        result.current.mutateConfig.mutateAsync({
          pageSize: 100,
          sort: 'name:DESC',
        });
      });

      expect(result.current.config.isLoading).toBe(true);

      await waitFor(() => expect(result.current.config.isLoading).toBe(false));
    });
  });
});
