import { useState } from 'react';
import { useFetchClient, useNotification, useAPIErrorHandler } from '@strapi/helper-plugin';

const useRegenerate = (url, id, onRegenerate, onError) => {
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
        toggleNotification({
          type: 'warning',
          message: formatAPIError(error),
        });
      }
    }
  };

  return {
    regenerateData,
    isLoadingConfirmation,
  };
};

export default useRegenerate;
