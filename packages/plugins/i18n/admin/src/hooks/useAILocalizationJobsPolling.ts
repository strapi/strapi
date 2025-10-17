import * as React from 'react';

import { useNotification } from '@strapi/admin/strapi-admin';
import { useIntl } from 'react-intl';

import { useGetAILocalizationJobsByDocumentQuery } from '../services/aiLocalizationJobs';
import { getTranslation } from '../utils/getTranslation';

interface UseAILocalizationJobsPollingOptions {
  documentId?: string;
}

export const useAILocalizationJobsPolling = ({
  documentId,
}: UseAILocalizationJobsPollingOptions) => {
  const { toggleNotification } = useNotification();
  const { formatMessage } = useIntl();

  const previousJobStatusRef = React.useRef<string | null>(null);

  /**
   * NOTE:
   * Due to a limitation with RTK query it is not possible to dynamically update the polling interval
   * @see https://github.com/reduxjs/redux-toolkit/issues/1651
   */
  const { data: initialJobData } = useGetAILocalizationJobsByDocumentQuery(documentId!, {
    skip: !documentId,
  });
  const { data: jobData } = useGetAILocalizationJobsByDocumentQuery(documentId!, {
    skip:
      (previousJobStatusRef.current !== 'processing' &&
        initialJobData?.data?.status !== 'processing') ||
      !documentId,
    pollingInterval: 1000,
  });

  const job = jobData?.data || initialJobData?.data;
  const currentJobStatus = job?.status;

  // Check for job status changes and trigger callbacks
  React.useEffect(() => {
    if (!currentJobStatus) return;

    const previousStatus = previousJobStatusRef.current;
    if (previousStatus === 'processing' && currentJobStatus === 'completed') {
      toggleNotification({
        type: 'success',
        message: formatMessage({
          id: getTranslation('CMEditViewAITranslation.job-completed'),
          defaultMessage: 'AI translation completed successfully!',
        }),
      });
    }

    if (previousStatus === 'processing' && currentJobStatus === 'failed') {
      toggleNotification({
        type: 'warning',
        message: formatMessage({
          id: getTranslation('CMEditViewAITranslation.job-failed'),
          defaultMessage: 'AI translation failed. Please try again.',
        }),
      });
    }

    previousJobStatusRef.current = currentJobStatus;
  }, [currentJobStatus, toggleNotification, formatMessage]);

  return {
    status: job?.status,
  };
};
