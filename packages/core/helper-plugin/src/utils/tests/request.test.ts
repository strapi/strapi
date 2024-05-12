import { server } from '@tests/utils';
import { rest } from 'msw';

import { request } from '../request';

interface ExpectedError extends Error {
  response: {
    status: number;
    payload: Record<string, unknown>;
  };
}

/**
 * request is deprecated and as such will fire a warning when rendered,
 * we therefore mock the console so we don't pollute the test output with warnings.
 */
jest.mock('../../utils/once', () => ({
  once: jest.fn(() => jest.fn()),
}));

describe('request', () => {
  it('should return the response successful requests', async () => {
    server.use(
      rest.get('*/resource', (req, res, ctx) => {
        return res(
          ctx.json({
            test: 'ok',
          })
        );
      })
    );

    const response = await request('https://some-domain.com/resource');
    expect(response).toEqual({ test: 'ok' });

    server.restoreHandlers();
  });

  it('should throw errors on failed requests', async () => {
    server.use(
      rest.get('*/resource', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ error: 'some info about the error' }));
      })
    );

    try {
      await request('https://some-domain.com/resource');

      // This line should not be reached, fail the test if it is
      expect(true).toBe(false);
    } catch (error) {
      expect((error as ExpectedError).response.status).toBe(500);
      expect((error as ExpectedError).response.payload).toEqual({
        error: 'some info about the error',
      });
    }

    server.restoreHandlers();
  });

  it('should watch server restart', async () => {
    const fetchSpy = jest.spyOn(window, 'fetch');
    server.use(
      rest.get('*/resource', (req, res, ctx) => {
        return res(
          ctx.json({
            test: 'ok',
          })
        );
      }),
      rest.head('*/_health', (req, res, ctx) => {
        return res(ctx.status(200));
      })
    );

    const response = await request('https://some-domain.com/resource', {}, true);
    expect(response).toEqual({ test: 'ok' });

    const lastCall = fetchSpy.mock.calls.at(-1);
    expect(lastCall?.length).toBe(2);
    expect(lastCall?.[0]).toBe('http://localhost:1337/_health');
    expect(lastCall?.[1]?.method).toBe('HEAD');
    expect(lastCall?.[1]?.mode).toBe('no-cors');
    expect(lastCall?.[1]?.keepalive).toBe(false);

    server.restoreHandlers();
  });
});
