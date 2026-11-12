// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type { sendDidEditAssignee } from '../services/metrics';
import type createWeeklyMetricsService from '../services/metrics/weekly-metrics';
import type { Equal, Expect } from './assert.test';
import type { WorkflowMetricsService, WorkflowWeeklyMetricsService } from './services';

type WeeklyMetricsImplementation = ReturnType<typeof createWeeklyMetricsService>;

// With strict types, the members take the parameters and results of the contract.
export type MetricsImplementationAssertions = [
  Expect<
    Equal<
      Parameters<typeof sendDidEditAssignee>,
      Parameters<WorkflowMetricsService['sendDidEditAssignee']>
    >
  >,
  // The stored schedule is read from the `plugin_ee_metrics` core store row
  Expect<
    Equal<
      ReturnType<WeeklyMetricsImplementation['ensureWeeklyStoredCronSchedule']>,
      ReturnType<WorkflowWeeklyMetricsService['ensureWeeklyStoredCronSchedule']>
    >
  >,
];
