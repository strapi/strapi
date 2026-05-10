import type { Core } from '@strapi/types';

import { isServerRequestPerfTrackingEnabled } from '../server-performance-tracking';

function mockStrapi(config: Record<string, unknown>): Core.Strapi {
  return {
    config: {
      get: (key: string) => config[key],
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
