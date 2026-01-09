import * as React from 'react';

import { useFetchClient, useNotification } from '@strapi/admin/strapi-admin';
import { useIntl } from 'react-intl';
import { useQuery, useQueryClient } from 'react-query';

import { AIMetadataJob } from '../../../shared/contracts/ai-metadata-jobs';
import { getTrad } from '../utils';

const fetchLatestJob = async (
  get: ReturnType<typeof useFetchClient>['get']
): Promise<AIMetadataJob | null> => {
  try {
    const { data } = await get('/upload/actions/generate-ai-metadata/latest');
    return data;
  } catch {
    // Return null on any error - UI treats this as "no active job"
    return null;
  }
};

export const useAIMetadataJob = () => {
  const { get } = useFetchClient();
  const { toggleNotification } = useNotification();
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();

  const [previousJobStatus, setPreviousJobStatus] = React.useState<AIMetadataJob['status'] | null>(
    null
  );

  // Initial query to get current job state
  const { data: initialJobData, refetch } = useQuery<AIMetadataJob | null, { message: string }>(
    ['ai-metadata-latest-job'],
    () => fetchLatestJob(get),
    {
      retry: false,
      refetchOnWindowFocus: false,
    }
  );

  // Polling query - starts when initial data or previous status indicates active job
  const { data: pollingJobData } = useQuery<AIMetadataJob | null, { message: string }>(
    ['ai-metadata-latest-job-polling'],
    () => fetchLatestJob(get),
    {
      enabled: initialJobData?.status === 'processing' || previousJobStatus === 'processing',
      // Stop polling once the polled job is completed or failed
      refetchInterval: (data) => {
        if (data?.status === 'completed' || data?.status === 'failed') {
          return false;
        }
        return 1000;
      },
      retry: false,
      refetchOnWindowFocus: false,
    }
  );

  // Use polling data if available, otherwise initial data
  const job = pollingJobData ?? initialJobData;
  const currentJobStatus = job?.status ?? null;

  // Detect status transitions and show notifications
  React.useEffect(() => {
    if (!currentJobStatus) return;

    // Detect transition from active state to completed
    if (previousJobStatus === 'processing' && currentJobStatus === 'completed') {
      const hasErrors = job?.errorCount && job.errorCount > 0;
      toggleNotification({
        type: hasErrors ? 'warning' : 'success',
        message: hasErrors
          ? formatMessage(
              {
                id: getTrad('settings.form.aiMetadata.job-completed-with-errors'),
                defaultMessage: 'Processed {successCount} images successfully, {errorCount} failed',
              },
              { successCount: job?.successCount ?? 0, errorCount: job?.errorCount ?? 0 }
            )
          : formatMessage(
              {
                id: getTrad('settings.form.aiMetadata.job-completed'),
                defaultMessage: 'Successfully processed {successCount} images',
              },
              { successCount: job?.successCount ?? 0 }
            ),
      });
      // Invalidate metadata count query to refresh the count
      queryClient.invalidateQueries(['ai-metadata-count']);
    }

    // Detect transition from active state to failed
    if (previousJobStatus === 'processing' && currentJobStatus === 'failed') {
      toggleNotification({
        type: 'danger',
        message: formatMessage({
          id: getTrad('settings.form.aiMetadata.job-failed'),
          defaultMessage: 'Failed to generate metadata. Please try again.',
        }),
      });
    }

    // Update previous status if it changed
    if (previousJobStatus !== currentJobStatus) {
      setPreviousJobStatus(currentJobStatus);
    }
  }, [
    currentJobStatus,
    previousJobStatus,
    job?.successCount,
    job?.errorCount,
    toggleNotification,
    formatMessage,
    queryClient,
  ]);

  return {
    data: job,
    refetch,
  };
};
