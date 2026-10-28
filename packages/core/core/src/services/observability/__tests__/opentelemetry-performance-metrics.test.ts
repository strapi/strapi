import { metrics } from '@opentelemetry/api';

import { PERFORMANCE_HUB_EVENT } from '../../performance/hub-events';
import {
  attachPerformanceMetricsHubListeners,
  registerOpenTelemetryPerformanceMetrics,
  shutdownOpenTelemetryPerformanceMetrics,
} from '../opentelemetry-performance-metrics';

const mockStrapi = (metricsEnabled: boolean) => {
  const unsubscribe = jest.fn();
  return {
    unsubscribe,
    strapi: {
      config: {
        get: jest.fn((key: string) =>
          key === 'server.observability.metrics.enabled' ? metricsEnabled : undefined
        ),
      },
      eventHub: {
        on: jest.fn(() => unsubscribe),
        subscribe: jest.fn(),
      },
    } as any,
  };
};

describe('opentelemetry performance metrics', () => {
  afterEach(() => {
    shutdownOpenTelemetryPerformanceMetrics();
    jest.restoreAllMocks();
  });

  it('uses the API meter without registering a global MeterProvider', () => {
    const setGlobal = jest.spyOn(metrics, 'setGlobalMeterProvider');
    const getMeter = jest.spyOn(metrics, 'getMeter');
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
    const record = jest.fn();
    jest.spyOn(metrics, 'getMeter').mockReturnValue({
      createHistogram: () => ({ record }),
      createCounter: () => ({ add: jest.fn() }),
    } as any);
    const { strapi } = mockStrapi(true);

    registerOpenTelemetryPerformanceMetrics(strapi);
    attachPerformanceMetricsHubListeners(strapi);

    const [, onSummary] = strapi.eventHub.on.mock.calls[0];
    await onSummary({ method: 'get', route: '/api/articles', durationMs: 12, dbTotalMs: 4 });

    expect(record).toHaveBeenCalledWith(
      12,
      expect.objectContaining({ 'http.route': '/api/articles' })
    );
    expect(record).toHaveBeenCalledWith(4, expect.anything());
  });

  it('does nothing when metrics are disabled', () => {
    const getMeter = jest.spyOn(metrics, 'getMeter');
    const { strapi } = mockStrapi(false);

    registerOpenTelemetryPerformanceMetrics(strapi);
    attachPerformanceMetricsHubListeners(strapi);

    expect(getMeter).not.toHaveBeenCalled();
    expect(strapi.eventHub.on).not.toHaveBeenCalled();
  });
});
