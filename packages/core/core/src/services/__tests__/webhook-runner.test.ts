import { createHmac } from 'crypto';

import createWebhookRunner from '../webhook-runner';
import type { WebhookRunner } from '../webhook-runner';

type Webhook = Parameters<WebhookRunner['run']>[0];

const makeWebhook = (overrides: Partial<Webhook> = {}): Webhook =>
  ({
    id: '1',
    name: 'test-webhook',
    url: 'http://localhost:1337/hook',
    headers: {},
    events: ['entry.create'],
    isEnabled: true,
    ...overrides,
  }) as Webhook;

const createRunner = (
  fetchImpl?: (...args: any[]) => Promise<any>,
  configuration: Record<string, unknown> = { defaultHeaders: {} }
) => {
  const fetch = jest.fn(fetchImpl ?? (() => Promise.resolve({ ok: true, status: 200 }) as any));
  const eventHub = { on: jest.fn(), off: jest.fn(), emit: jest.fn() };
  const logger = { debug: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() };

  const runner = createWebhookRunner({
    eventHub: eventHub as any,
    logger: logger as any,
    configuration,
    fetch: fetch as any,
  });

  return { runner, fetch, eventHub, logger };
};

const getSentInit = (fetch: jest.Mock) => fetch.mock.calls[0][1];

describe('WebhookRunner - HMAC signing', () => {
  describe('getSignatureHeaders', () => {
    test('returns no headers when the webhook has no secret', () => {
      const { runner } = createRunner();

      expect(runner.getSignatureHeaders('{"event":"entry.create"}')).toEqual({});
      expect(runner.getSignatureHeaders('{"event":"entry.create"}', '')).toEqual({});
    });

    test('signs the body with HMAC-SHA256 and prefixes the scheme (golden vector)', () => {
      const { runner } = createRunner();
      const body = '{"event":"entry.create","createdAt":"2026-01-01T00:00:00.000Z"}';
      const secret = 'super-secret';

      const expected = createHmac('sha256', secret).update(body, 'utf8').digest('hex');

      expect(runner.getSignatureHeaders(body, secret)).toEqual({
        'X-Strapi-Signature-256': `sha256=${expected}`,
      });
    });
  });

  describe('run', () => {
    test('does not add a signature header when no secret is configured (backward compatible)', async () => {
      const { runner, fetch } = createRunner();

      await runner.run(makeWebhook(), 'entry.create', { id: 1 });

      const { headers } = getSentInit(fetch);
      expect(headers).not.toHaveProperty('X-Strapi-Signature-256');
      // The pre-existing Strapi headers are untouched
      expect(headers['X-Strapi-Event']).toBe('entry.create');
      expect(headers['Content-Type']).toBe('application/json');
    });

    test('adds a signature computed over the exact body that is sent', async () => {
      const secret = 'whsec_test';
      const { runner, fetch } = createRunner(undefined);

      await runner.run(makeWebhook({ secret }), 'entry.create', { id: 42 });

      const { body, headers } = getSentInit(fetch);
      const expected = createHmac('sha256', secret).update(body, 'utf8').digest('hex');

      expect(headers['X-Strapi-Signature-256']).toBe(`sha256=${expected}`);
    });

    test('preserves user-defined custom headers alongside the signature', async () => {
      const { runner, fetch } = createRunner(undefined);

      await runner.run(
        makeWebhook({ secret: 'shh', headers: { Authorization: 'Bearer abc' } }),
        'entry.create',
        {}
      );

      const { headers } = getSentInit(fetch);
      expect(headers.Authorization).toBe('Bearer abc');
      expect(headers['X-Strapi-Signature-256']).toMatch(/^sha256=[a-f0-9]{64}$/);
    });

    test('a custom header cannot override the generated signature', async () => {
      const { runner, fetch } = createRunner(undefined);

      await runner.run(
        makeWebhook({
          secret: 'shh',
          // A malicious/mistaken attempt to pin a forged signature
          headers: { 'X-Strapi-Signature-256': 'sha256=deadbeef' },
        }),
        'entry.create',
        {}
      );

      const { body, headers } = getSentInit(fetch);
      const expected = createHmac('sha256', 'shh').update(body, 'utf8').digest('hex');

      expect(headers['X-Strapi-Signature-256']).toBe(`sha256=${expected}`);
      expect(headers['X-Strapi-Signature-256']).not.toBe('sha256=deadbeef');
    });
  });
});
