import { useState } from 'react';
import { useFetchClient, useNotification, useAPIErrorHandler } from '@strapi/helper-plugin';

const useRegenerate = (id, onRegenerate) => {
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
      } = await post(`/admin/api-tokens/${id}/regenerate`);
      setIsLoadingConfirmation(false);
      onRegenerate(accessKey);
    } catch (error) {
      setIsLoadingConfirmation(false);
      toggleNotification({
        type: 'warning',
        message: formatAPIError(error),
      });
    }
  };

  return {
    regenerateData,
    isLoadingConfirmation,
  };
};

export default useRegenerate;
