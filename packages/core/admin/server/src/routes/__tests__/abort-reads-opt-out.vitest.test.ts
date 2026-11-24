import { describe, expect, test } from 'vitest';

import authentication from '../authentication';
import transfer from '../transfer';
import users from '../users';

type Route = { method: string; path: string; config?: Record<string, unknown> };

const flag = (route: Route | undefined) => route?.config?.abortReadsOnRequestDisconnect;

describe('admin routes and the request abort signal', () => {
  test.each(['/transfer/runner/push', '/transfer/runner/pull'])(
    'the long lived transfer session GET %s opts out',
    (path) => {
      const route = (transfer as Route[]).find((r) => r.method === 'GET' && r.path === path);

      expect(flag(route)).toBe(false);
    }
  );

  test('no other route needs an opt out: logout and session revocation are POST and DELETE', () => {
    const optedOut = [
      ...(authentication as Route[]),
      ...(transfer as Route[]),
      ...(users as Route[]),
    ]
      .filter((route) => flag(route) !== undefined)
      .map((route) => `${route.method} ${route.path}`);

    expect(optedOut.sort()).toEqual(['GET /transfer/runner/pull', 'GET /transfer/runner/push']);
  });
});
