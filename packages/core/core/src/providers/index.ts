import admin from './admin';
import ai from './ai';
import coreStore from './coreStore';
import cron from './cron';
import performanceMonitor from './performance-monitor';
import observabilityTracing from './observability-tracing';
import observabilityPerformanceMetrics from './observability-performance-metrics';
import registries from './registries';
import sessionManager from './session-manager';
import telemetry from './telemetry';
import webhooks from './webhooks';

import type { Provider } from './provider';

/** Providers run in order for register/bootstrap/destroy; names are used for startup tracing spans. */
export type NamedProvider = { name: string; definition: Provider };

export const providers: NamedProvider[] = [
  { name: 'registries', definition: registries },
  { name: 'performance-monitor', definition: performanceMonitor },
  { name: 'observability-tracing', definition: observabilityTracing },
  { name: 'observability-performance-metrics', definition: observabilityPerformanceMetrics },
  { name: 'admin', definition: admin },
  { name: 'ai', definition: ai },
  { name: 'core-store', definition: coreStore },
  { name: 'session-manager', definition: sessionManager },
  { name: 'webhooks', definition: webhooks },
  { name: 'telemetry', definition: telemetry },
  { name: 'cron', definition: cron },
];
