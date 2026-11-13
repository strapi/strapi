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
 * The most recent backfill job, whatever its status, so the admin can resume
 * polling a running job or report how the last one ended. The job is the bare
 * response body, not wrapped in `{ data }`. 404s when no job exists or AI
 * metadata is not enabled, so there is no `null` on the wire — callers get an
 * error response instead.
 */
export declare namespace GetLatestAIMetadataJob {
  export interface Request {
    query?: {};
  }

  export type Response = AIMetadataJob;
}

/**
 * The other two job endpoints — `POST /upload/ai-metadata-jobs` and
 * `GET /upload/ai-metadata-jobs/pending-count` — are declared in `./files.ts`
 * as `CreateAIMetadataJob` and `GetAIMetadataPendingCount`, the single source
 * of truth for both. Like this endpoint, they send a bare response body.
 */
