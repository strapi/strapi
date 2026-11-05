// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type { sendDidEditAssignee } from '../services/metrics';
import type { Equal, Expect } from './assert.test';
import type { WorkflowMetricsService } from './services';

// With strict types, the members take the parameters of the contract.
export type MetricsImplementationAssertions = [
  Expect<
    Equal<
      Parameters<typeof sendDidEditAssignee>,
      Parameters<WorkflowMetricsService['sendDidEditAssignee']>
    >
  >,
];
