// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type { Equal, Expect } from './assert.test';
import type { AIMetadataJobRow, AIMetadataJobsService } from './services';
import type { createAIMetadataJobsService } from '../services/ai-metadata-jobs';

type AIMetadataJobs = ReturnType<typeof createAIMetadataJobsService>;

export type Assertions = [
  // The results are the contract's rows: the database reads the dates back as ISO strings.
  Expect<Equal<Awaited<ReturnType<AIMetadataJobs['getJob']>>, AIMetadataJobRow | null>>,
  Expect<
    Equal<
      Awaited<ReturnType<AIMetadataJobs['getJob']>>,
      Awaited<ReturnType<AIMetadataJobsService['getJob']>>
    >
  >,
  Expect<
    Equal<
      Awaited<ReturnType<AIMetadataJobs['getLatestActiveJob']>>,
      Awaited<ReturnType<AIMetadataJobsService['getLatestActiveJob']>>
    >
  >,
];
