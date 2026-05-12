import type { Core } from '@strapi/types';
import type { Span } from '@opentelemetry/api';

import {
  withContentApiSpan,
  withStartupSpan,
  withStartupTraceChildPhase,
} from '../opentelemetry-tracing';

function mockStrapi(tracingEnabled: boolean): Core.Strapi {
  return {
    config: {
      get(key: string) {
        if (key === 'server.observability.tracing.enabled') {
          return tracingEnabled;
        }
        return undefined;
      },
    },
  } as Core.Strapi;
}

describe('withContentApiSpan', () => {
  it('runs fn directly when tracing is disabled', async () => {
    const strapi = mockStrapi(false);
    const fn = jest.fn().mockResolvedValue('ok');

    await expect(
      withContentApiSpan(strapi, 'strapi.content-api.test', { 'strapi.content_type.uid': 'x' }, fn)
    ).resolves.toBe('ok');

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('runs fn when strapi is undefined', async () => {
    const fn = jest.fn().mockResolvedValue(1);
    await expect(withContentApiSpan(undefined, 'strapi.content-api.test', {}, fn)).resolves.toBe(1);
    expect(fn).toHaveBeenCalled();
  });

  it('propagates errors when tracing is disabled', async () => {
    const strapi = mockStrapi(false);
    const fn = jest.fn().mockRejectedValue(new Error('boom'));

    await expect(withContentApiSpan(strapi, 'strapi.content-api.test', {}, fn)).rejects.toThrow(
      'boom'
    );
  });
});

describe('withStartupSpan', () => {
  it('runs fn when tracing is disabled', async () => {
    const strapi = mockStrapi(false);
    const fn = jest.fn().mockResolvedValue('done');

    await expect(
      withStartupSpan(strapi, 'strapi.startup.register', fn, { root: true })
    ).resolves.toBe('done');

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('runs fn when tracing is enabled but Node provider is not initialized', async () => {
    const strapi = mockStrapi(true);
    const fn = jest.fn().mockResolvedValue(42);

    await expect(withStartupSpan(strapi, 'strapi.startup.bootstrap', fn)).resolves.toBe(42);
    expect(fn).toHaveBeenCalled();
  });
});

describe('withStartupTraceChildPhase', () => {
  it('runs fn when parent span is undefined', async () => {
    const strapi = mockStrapi(true);
    const fn = jest.fn().mockResolvedValue('x');

    await expect(
      withStartupTraceChildPhase(undefined, strapi, 'strapi.startup.cli.test', fn)
    ).resolves.toBe('x');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('runs fn when tracing is disabled even if parent is set', async () => {
    const strapi = mockStrapi(false);
    const fn = jest.fn().mockResolvedValue(1);

    await expect(
      withStartupTraceChildPhase({} as Span, strapi, 'strapi.startup.cli.test', fn)
    ).resolves.toBe(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
