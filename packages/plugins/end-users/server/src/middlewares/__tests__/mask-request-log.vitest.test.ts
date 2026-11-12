import { describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';

import { maskRequestLog, maskSecretsInUrl } from '../mask-request-log';

const BASE = '/api/auth';

describe('maskSecretsInUrl', () => {
  it('blanks the token in a reset-password path and keeps the rest of the line', () => {
    expect(
      maskSecretsInUrl(`GET ${BASE}/reset-password/abc123?callbackURL=%2Freset (12 ms) 302`, BASE)
    ).toBe(`GET ${BASE}/reset-password/[masked]?callbackURL=%2Freset (12 ms) 302`);
  });

  it('blanks the one-time values in a query string, whatever their case', () => {
    expect(maskSecretsInUrl(`GET ${BASE}/verify-email?token=eyJ.a.b (3 ms) 200`, BASE)).toBe(
      `GET ${BASE}/verify-email?token=[masked] (3 ms) 200`
    );
    expect(maskSecretsInUrl(`GET ${BASE}/magic-link/verify?callbackURL=%2F&Token=xyz`, BASE)).toBe(
      `GET ${BASE}/magic-link/verify?callbackURL=%2F&Token=[masked]`
    );
    expect(
      maskSecretsInUrl('GET /api/auth/email-confirmation?confirmation=c0de (1 ms) 302', BASE)
    ).toBe('GET /api/auth/email-confirmation?confirmation=[masked] (1 ms) 302');
  });

  it('follows the base path, and leaves a line with no secret alone', () => {
    expect(maskSecretsInUrl('GET /auth/reset-password/abc (1 ms) 200', '/auth')).toBe(
      'GET /auth/reset-password/[masked] (1 ms) 200'
    );
    expect(maskSecretsInUrl('GET /api/notes?filters[title]=a (4 ms) 200', BASE)).toBe(
      'GET /api/notes?filters[title]=a (4 ms) 200'
    );
    // Not the engine's path: another route that happens to be called the same
    expect(maskSecretsInUrl('GET /other/reset-password/abc (1 ms) 200', BASE)).toBe(
      'GET /other/reset-password/abc (1 ms) 200'
    );
  });
});

describe('maskRequestLog', () => {
  const strapiWith = (http: unknown, prefix?: string) =>
    ({
      config: { get: (path: string) => (path === 'api.rest.prefix' ? prefix : undefined) },
      log: { http },
    }) as unknown as Core.Strapi;

  it('masks what the request logger writes at the http level, and nothing else', () => {
    const http = vi.fn();
    const strapi = strapiWith(http);

    maskRequestLog(strapi);
    strapi.log.http(`GET ${BASE}/reset-password/secret-token (5 ms) 200`);
    strapi.log.http({ kept: 'as it is' } as never);

    expect(http).toHaveBeenNthCalledWith(1, `GET ${BASE}/reset-password/[masked] (5 ms) 200`);
    expect(http).toHaveBeenNthCalledWith(2, { kept: 'as it is' });
  });

  it('wraps once however many times it is installed, and keeps the logger as `this`', () => {
    const calls: unknown[] = [];
    const log = {
      http(this: unknown, message: string) {
        calls.push([this, message]);
      },
    };
    const strapi = { config: { get: () => undefined }, log } as unknown as Core.Strapi;

    maskRequestLog(strapi);
    maskRequestLog(strapi);
    strapi.log.http(`GET ${BASE}/verify-email?token=abc (1 ms) 200`);

    expect(calls).toEqual([[log, `GET ${BASE}/verify-email?token=[masked] (1 ms) 200`]]);
  });

  it('reads the REST prefix of the application', () => {
    const http = vi.fn();
    const strapi = strapiWith(http, '/v1');

    maskRequestLog(strapi);
    strapi.log.http('GET /v1/auth/reset-password/secret (1 ms) 200');

    expect(http).toHaveBeenCalledWith('GET /v1/auth/reset-password/[masked] (1 ms) 200');
  });

  it('does nothing for an application whose logger has no http level', () => {
    expect(() => maskRequestLog({ log: {} } as unknown as Core.Strapi)).not.toThrow();
    expect(() => maskRequestLog({} as unknown as Core.Strapi)).not.toThrow();
  });
});
