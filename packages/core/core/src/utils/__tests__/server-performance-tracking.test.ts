import type { Core } from '@strapi/types';

import {
  getServerRequestPerformanceEmitSettings,
  isServerRequestPerfTrackingEnabled,
} from '../server-performance-tracking';

function mockStrapi(config: Record<string, unknown>): Core.Strapi {
  return {
    config: {
      get: (key: string, def?: unknown) => (config[key] !== undefined ? config[key] : def),
    },
  } as Core.Strapi;
}

describe('isServerRequestPerfTrackingEnabled', () => {
  it('is true when requestSummaryEnabled is true', () => {
    expect(
      isServerRequestPerfTrackingEnabled(
        mockStrapi({ 'server.performance.requestSummaryEnabled': true })
      )
    ).toBe(true);
  });

  it('is true when requestTrackingEnabled is true', () => {
    expect(
      isServerRequestPerfTrackingEnabled(
        mockStrapi({ 'server.performance.requestTrackingEnabled': true })
      )
    ).toBe(true);
  });

  it('is false when both are unset or false', () => {
    expect(isServerRequestPerfTrackingEnabled(mockStrapi({}))).toBe(false);
    expect(
      isServerRequestPerfTrackingEnabled(
        mockStrapi({
          'server.performance.requestSummaryEnabled': false,
          'server.performance.requestTrackingEnabled': false,
        })
      )
    ).toBe(false);
  });
});

describe('getServerRequestPerformanceEmitSettings', () => {
  it('returns defaults when unset', () => {
    expect(getServerRequestPerformanceEmitSettings(mockStrapi({}))).toEqual({
      slowRequestMs: 500,
      requestSampleRate: 0.1,
      emitStageEvents: false,
    });
  });

  it('clamps sample rate into unit interval', () => {
    expect(
      getServerRequestPerformanceEmitSettings(
        mockStrapi({ 'server.performance.requestSampleRate': 2 })
      ).requestSampleRate
    ).toBe(1);
    expect(
      getServerRequestPerformanceEmitSettings(
        mockStrapi({ 'server.performance.requestSampleRate': -1 })
      ).requestSampleRate
    ).toBe(0);
  });
});
