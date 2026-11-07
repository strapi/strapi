// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type { Equal, Expect } from './assert.test';
import type { ContentStructureService, MetricsService, PreviewService } from './services';
import type createContentStructureService from '../services/content-structure';
import type createMetricsService from '../services/metrics';
import type { createPreviewService } from '../preview/services/preview';

// Each factory returns exactly its contract's members.
export type ContentStructureMembers = Expect<
  Equal<keyof ReturnType<typeof createContentStructureService>, keyof ContentStructureService>
>;
export type MetricsMembers = Expect<
  Equal<keyof ReturnType<typeof createMetricsService>, keyof MetricsService>
>;
export type PreviewMembers = Expect<
  Equal<keyof ReturnType<typeof createPreviewService>, keyof PreviewService>
>;
