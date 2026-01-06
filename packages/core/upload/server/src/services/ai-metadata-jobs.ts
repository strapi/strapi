import crypto from 'crypto';

interface JobStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalFiles: number;
  processedFiles: number;
  successCount: number;
  errorCount: number;
  errors: Array<{ fileId: number; error: string }>;
  userId: number;
  createdAt: Date;
  completedAt?: Date;
}

// In-memory store for jobs
const jobs = new Map<string, JobStatus>();

const createAIMetadataJobsService = () => {
  return {
    createJob(userId: number, totalFiles: number): string {
      const jobId = crypto.randomUUID();
      jobs.set(jobId, {
        id: jobId,
        status: 'pending',
        totalFiles,
        processedFiles: 0,
        successCount: 0,
        errorCount: 0,
        errors: [],
        userId,
        createdAt: new Date(),
      });
      return jobId;
    },

    getJob(jobId: string, userId: number): JobStatus | null {
      const job = jobs.get(jobId);
      if (!job || job.userId !== userId) {
        return null;
      }
      return job;
    },

    updateJob(
      jobId: string,
      updates: Partial<Omit<JobStatus, 'id' | 'userId' | 'createdAt'>>
    ): void {
      const job = jobs.get(jobId);
      if (job) {
        jobs.set(jobId, { ...job, ...updates });
      }
    },

    deleteJob(jobId: string): void {
      jobs.delete(jobId);
    },
  };
};

export { createAIMetadataJobsService };
export type { JobStatus };
