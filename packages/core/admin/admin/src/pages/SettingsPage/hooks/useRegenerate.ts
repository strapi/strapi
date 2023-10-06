import { useState } from 'react';

import { useAPIErrorHandler, useFetchClient, useNotification } from '@strapi/helper-plugin';
import { AxiosError } from 'axios';

export const useRegenerate = (
  url: string,
  id: number | string,
  onRegenerate: (accessKey: string) => void,
  onError?: (error: unknown) => void
): { isLoadingConfirmation: boolean; regenerateData: () => void } => {
  const [isLoadingConfirmation, setIsLoadingConfirmation] = useState(false);
  const toggleNotification = useNotification();
  const { post } = useFetchClient();
  const { formatAPIError } = useAPIErrorHandler();

  const regenerateData = async () => {
    try {
      const {
        data: {
          data: { accessKey },
        },
      } = await post(`${url}${id}/regenerate`);
      setIsLoadingConfirmation(false);
      onRegenerate(accessKey);
    } catch (error) {
      setIsLoadingConfirmation(false);

      if (onError) {
        onError(error);
      } else {
        if (error instanceof AxiosError) {
          toggleNotification({
            type: 'warning',
            message: formatAPIError(error),
          });
        }
      }
    }
  };

  return {
    regenerateData,
    isLoadingConfirmation,
  };
};
