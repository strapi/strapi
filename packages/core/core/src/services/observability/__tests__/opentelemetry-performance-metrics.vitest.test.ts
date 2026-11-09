import { describe, it, expect, afterEach, vi } from 'vitest';
import { metrics } from '@opentelemetry/api';

import { PERFORMANCE_HUB_EVENT } from '../../performance/hub-events';
import {
  attachPerformanceMetricsHubListeners,
  registerOpenTelemetryPerformanceMetrics,
  shutdownOpenTelemetryPerformanceMetrics,
} from '../opentelemetry-performance-metrics';

const mockStrapi = (metricsEnabled: boolean) => {
  const unsubscribe = vi.fn();
  return {
    unsubscribe,
    strapi: {
      config: {
        get: vi.fn((key: string) =>
          key === 'server.observability.metrics.enabled' ? metricsEnabled : undefined
        ),
      },
      eventHub: {
        on: vi.fn(() => unsubscribe),
        subscribe: vi.fn(),
      },
    } as any,
  };
};

describe('opentelemetry performance metrics', () => {
  afterEach(() => {
    shutdownOpenTelemetryPerformanceMetrics();
    vi.restoreAllMocks();
  });

  it('uses the API meter without registering a global MeterProvider', () => {
    const setGlobal = vi.spyOn(metrics, 'setGlobalMeterProvider');
    const getMeter = vi.spyOn(metrics, 'getMeter');
    const { strapi } = mockStrapi(true);

    registerOpenTelemetryPerformanceMetrics(strapi);

    expect(setGlobal).not.toHaveBeenCalled();
    expect(getMeter).toHaveBeenCalledWith('strapi.performance', '1.0.0');
  });

  it('listens only to specific performance events and unsubscribes on dispose', () => {
    const { strapi, unsubscribe } = mockStrapi(true);

    registerOpenTelemetryPerformanceMetrics(strapi);
    const dispose = attachPerformanceMetricsHubListeners(strapi);

    expect(strapi.eventHub.subscribe).not.toHaveBeenCalled();
    expect(strapi.eventHub.on.mock.calls.map(([name]: [string]) => name)).toEqual([
      PERFORMANCE_HUB_EVENT.REQUEST_SUMMARY,
      PERFORMANCE_HUB_EVENT.DB_QUERY_SLOW,
      PERFORMANCE_HUB_EVENT.DB_QUERY_ERROR,
    ]);

    dispose();
    expect(unsubscribe).toHaveBeenCalledTimes(3);
  });

  it('records request summaries on API instruments', async () => {
    const record = vi.fn();
    vi.spyOn(metrics, 'getMeter').mockReturnValue({
      createHistogram: () => ({ record }),
      createCounter: () => ({ add: vi.fn() }),
    } as any);
    const { strapi } = mockStrapi(true);

    registerOpenTelemetryPerformanceMetrics(strapi);
    attachPerformanceMetricsHubListeners(strapi);

    const [, onSummary] = strapi.eventHub.on.mock.calls[0];
    await onSummary({
      method: 'get',
      route: '/api/articles',
      durationMs: 12,
      dbTotalMs: 4,
      dbQueryCount: 7,
    });

    expect(record).toHaveBeenCalledWith(
      12,
      expect.objectContaining({ 'http.route': '/api/articles' })
    );
    expect(record).toHaveBeenCalledWith(4, expect.anything());
    expect(record).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ 'http.route': '/api/articles' })
    );
  });

  it('does nothing when metrics are disabled', () => {
    const getMeter = vi.spyOn(metrics, 'getMeter');
    const { strapi } = mockStrapi(false);

    registerOpenTelemetryPerformanceMetrics(strapi);
    attachPerformanceMetricsHubListeners(strapi);

    expect(getMeter).not.toHaveBeenCalled();
    expect(strapi.eventHub.on).not.toHaveBeenCalled();
  });
});
