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

export const useAIMetadataJob = (options?: { enabled?: boolean }) => {
  const { get } = useFetchClient();
  const { toggleNotification } = useNotification();
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  const enabled = options?.enabled ?? true;

  const [previousJobStatus, setPreviousJobStatus] = React.useState<AIMetadataJob['status'] | null>(
    null
  );

  // Single query with conditional polling
  const { data: job, refetch } = useQuery<AIMetadataJob | null, { message: string }>(
    ['ai-metadata-latest-job'],
    () => fetchLatestJob(get),
    {
      enabled,
      // Poll every second when job is processing
      refetchInterval: (data) => {
        // If no data yet, don't poll
        if (!data) return false;

        // Poll while processing
        if (data.status === 'processing') {
          return 1000;
        }

        // Stop polling when completed or failed
        return false;
      },
      retry: false,
      refetchOnWindowFocus: false,
    }
  );

  const currentJobStatus = job?.status ?? null;

  // Detect status transitions and show notifications
  React.useEffect(() => {
    if (!currentJobStatus) return;

    // Detect transition from active state to completed
    if (previousJobStatus === 'processing' && currentJobStatus === 'completed') {
      toggleNotification({
        type: 'success',
        message: formatMessage({
          id: getTrad('settings.form.aiMetadata.job-completed'),
          defaultMessage: 'Successfully generated metadata',
        }),
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
  }, [currentJobStatus, previousJobStatus, toggleNotification, formatMessage, queryClient]);

  return {
    data: job,
    refetch,
  };
};
