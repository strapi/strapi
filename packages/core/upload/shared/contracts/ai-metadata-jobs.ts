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
 * Return the latest AI metadata job
 */
export declare namespace GetLatestAIMetadataJob {
  export interface Request {
    query?: {};
  }

  export interface Response {
    data: AIMetadataJob | null;
  }
}

/**
 * POST /upload/ai-metadata-jobs
 *
 * Start a new AI metadata generation job
 */
export declare namespace StartAIMetadataJob {
  export interface Request {
    body?: {};
  }

  export interface Response {
    data: {
      jobId: number;
      status: string;
    };
  }
}

/**
 * GET /upload/ai-metadata-jobs/pending-count
 *
 * Return count of images without metadata
 */
export declare namespace GetAIMetadataCount {
  export interface Request {
    query?: {};
  }

  export interface Response {
    data: {
      count: number;
    };
  }
}
