// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type metrics from '../services/metrics';
import type { Equal, Expect } from './assert.test';
import type { MetricsService } from './services';

type MetricsImplementation = ReturnType<typeof metrics>;

// The gated `properties` takes the contract's type in the strict program, not `any`.
export type TrackUsageParameters = Expect<
  Equal<Parameters<MetricsImplementation['trackUsage']>, Parameters<MetricsService['trackUsage']>>
>;
