import { describe, it, expect, afterEach, vi } from 'vitest';
import type { Core } from '@strapi/types';
import { context, propagation, trace, type Span } from '@opentelemetry/api';

import {
  configureOpenTelemetryTracing,
  shutdownOpenTelemetryTracing,
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
    const fn = vi.fn().mockResolvedValue('ok');

    await expect(
      withContentApiSpan(strapi, 'strapi.content-api.test', { 'strapi.content_type.uid': 'x' }, fn)
    ).resolves.toBe('ok');

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('runs fn when strapi is undefined', async () => {
    const fn = vi.fn().mockResolvedValue(1);
    await expect(withContentApiSpan(undefined, 'strapi.content-api.test', {}, fn)).resolves.toBe(1);
    expect(fn).toHaveBeenCalled();
  });

  it('propagates errors when tracing is disabled', async () => {
    const strapi = mockStrapi(false);
    const fn = vi.fn().mockRejectedValue(new Error('boom'));

    await expect(withContentApiSpan(strapi, 'strapi.content-api.test', {}, fn)).rejects.toThrow(
      'boom'
    );
  });
});

describe('withStartupSpan', () => {
  it('runs fn when tracing is disabled', async () => {
    const strapi = mockStrapi(false);
    const fn = vi.fn().mockResolvedValue('done');

    await expect(
      withStartupSpan(strapi, 'strapi.startup.register', fn, { root: true })
    ).resolves.toBe('done');

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('runs fn when tracing is enabled and no SDK is registered', async () => {
    const strapi = mockStrapi(true);
    const fn = vi.fn().mockResolvedValue(42);

    await expect(withStartupSpan(strapi, 'strapi.startup.bootstrap', fn)).resolves.toBe(42);
    expect(fn).toHaveBeenCalled();
  });
});

describe('withStartupTraceChildPhase', () => {
  it('runs fn when parent span is undefined', async () => {
    const strapi = mockStrapi(true);
    const fn = vi.fn().mockResolvedValue('x');

    await expect(
      withStartupTraceChildPhase(undefined, strapi, 'strapi.startup.cli.test', fn)
    ).resolves.toBe('x');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('runs fn when tracing is disabled even if parent is set', async () => {
    const strapi = mockStrapi(false);
    const fn = vi.fn().mockResolvedValue(1);

    await expect(
      withStartupTraceChildPhase({} as Span, strapi, 'strapi.startup.cli.test', fn)
    ).resolves.toBe(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('configureOpenTelemetryTracing', () => {
  afterEach(() => vi.restoreAllMocks());

  it('does not register a global provider, propagator, or context manager', async () => {
    const setTracerProvider = vi.spyOn(trace, 'setGlobalTracerProvider');
    const setPropagator = vi.spyOn(propagation, 'setGlobalPropagator');
    const setContextManager = vi.spyOn(context, 'setGlobalContextManager');

    configureOpenTelemetryTracing(mockStrapi(true));
    await shutdownOpenTelemetryTracing();

    expect(setTracerProvider).not.toHaveBeenCalled();
    expect(setPropagator).not.toHaveBeenCalled();
    expect(setContextManager).not.toHaveBeenCalled();
  });
});
