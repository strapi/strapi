/**
 * AI Metadata Job types shared between admin and server
 */

export interface AIMetadataJob {
  id: number;
  status: 'processing' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
}

/**
 * GET /upload/ai-metadata-jobs/latest
 *
 * The most recent still-active backfill job. 404s when nothing is running, so
 * there is no `null` on the wire — callers get an error response instead.
 */
export declare namespace GetLatestAIMetadataJob {
  export interface Request {
    query?: {};
  }

  export interface Response {
    data: AIMetadataJob;
  }
}

/**
 * The other two job endpoints — `POST /upload/ai-metadata-jobs` and
 * `GET /upload/ai-metadata-jobs/pending-count` — are declared in `./files.ts`
 * as `CreateAIMetadataJob` and `GetAIMetadataPendingCount`. They used to be
 * duplicated here under different names and with response shapes that had
 * drifted from what the controllers actually return; `./files.ts` is the one
 * that matched, so it is the single source of truth for both.
 */
