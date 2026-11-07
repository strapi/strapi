/**
 * AI Metadata Job types shared between admin and server
 */

/**
 * A job row as read back from the database and sent to the admin. The database
 * layer returns `datetime` columns as ISO 8601 strings, and `completedAt` is
 * `null` until the job finishes.
 */
export interface AIMetadataJob {
  id: number;
  status: 'processing' | 'completed' | 'failed';
  createdAt: string;
  completedAt: string | null;
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
