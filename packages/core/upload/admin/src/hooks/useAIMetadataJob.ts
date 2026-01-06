import { useFetchClient } from '@strapi/admin/strapi-admin';
import { useQuery } from 'react-query';

interface JobStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalFiles: number;
  processedFiles: number;
  successCount: number;
  errorCount: number;
  errors: Array<{ fileId: number; error: string }>;
  progress: number;
}

export const useAIMetadataJob = (jobId: string | null) => {
  const { get } = useFetchClient();

  return useQuery<JobStatus, { message: string }>(
    ['ai-metadata-job', jobId],
    async () => {
      const { data } = await get(`/upload/actions/generate-ai-metadata/status/${jobId}`);
      return data;
    },
    {
      enabled: !!jobId,
      refetchInterval: (data) => {
        // Poll every 2s if still processing
        if (data?.status === 'pending' || data?.status === 'processing') {
          return 2000;
        }
        return false; // Stop polling when done
      },
      retry: false,
    }
  );
};
