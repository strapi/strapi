import * as React from 'react';

import { useNotification, adminApi } from '@strapi/admin/strapi-admin';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';

import { AILocalizationJobs } from '../../../shared/contracts/ai-localization-jobs';
import { useGetAILocalizationJobsByDocumentQuery } from '../services/aiLocalizationJobs';
import { getTranslation } from '../utils/getTranslation';

interface UseAILocalizationJobsPollingOptions {
  documentId?: string;
  model?: string;
  collectionType?: string;
}

export const useAILocalizationJobsPolling = ({
  documentId,
  model,
  collectionType,
}: UseAILocalizationJobsPollingOptions) => {
  const { toggleNotification } = useNotification();
  const { formatMessage } = useIntl();
  const dispatch = useDispatch();

  const [previousJobStatus, setPreviousJobStatus] = React.useState<
    AILocalizationJobs['status'] | null
  >(null);

  /**
   * NOTE:
   * Due to a limitation with RTK query it is not possible to dynamically update the polling interval
   * @see https://github.com/reduxjs/redux-toolkit/issues/1651
   */
  const { data: initialJobData } = useGetAILocalizationJobsByDocumentQuery({
    documentId: documentId!,
    model: model!,
    collectionType: collectionType!,
  });

  const shouldPoll =
    initialJobData?.data?.status === 'processing' || previousJobStatus === 'processing';
  const { data: jobData } = useGetAILocalizationJobsByDocumentQuery(
    { documentId: documentId!, model: model!, collectionType: collectionType! },
    {
      skip: !shouldPoll,
      pollingInterval: 1000,
    }
  );

  const job = jobData?.data || initialJobData?.data;
  const currentJobStatus = job?.status;

  const invalidateDocument = React.useCallback(() => {
    dispatch(
      adminApi.util.invalidateTags([
        {
          // @ts-expect-error tag isn't available
          type: 'Document',
          id: collectionType !== 'single-types' ? `${model}_${documentId}` : model,
        },
      ])
    );
  }, [dispatch, collectionType, model, documentId]);

  // Check for job status changes and trigger callbacks
  React.useEffect(() => {
    if (!currentJobStatus) return;

    // Detect transition from 'processing' to a terminal state
    if (previousJobStatus === 'processing' && currentJobStatus === 'completed') {
      toggleNotification({
        type: 'success',
        message: formatMessage({
          id: getTranslation('CMEditViewAITranslation.job-completed'),
          defaultMessage: 'AI translation completed successfully!',
        }),
      });
      invalidateDocument();
    }

    if (previousJobStatus === 'processing' && currentJobStatus === 'failed') {
      toggleNotification({
        type: 'warning',
        message: formatMessage({
          id: getTranslation('CMEditViewAITranslation.job-failed'),
          defaultMessage: 'AI translation failed. Please try again.',
        }),
      });
      invalidateDocument();
    }

    // Update the previous status if it changed
    if (previousJobStatus !== currentJobStatus) {
      setPreviousJobStatus(currentJobStatus);
    }
  }, [
    currentJobStatus,
    previousJobStatus,
    setPreviousJobStatus,
    toggleNotification,
    formatMessage,
    invalidateDocument,
  ]);

  return {
    status: job?.status,
  };
};
