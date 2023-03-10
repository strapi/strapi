import { useState } from 'react';
import { get } from 'lodash';
import { useFetchClient, useNotification } from '@strapi/helper-plugin';

const useRegenerate = (url, id, onRegenerate, onError) => {
  const [isLoadingConfirmation, setIsLoadingConfirmation] = useState(false);
  const toggleNotification = useNotification();
  const { post } = useFetchClient();

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
          message: get(error, 'response.data.message', 'notification.error'),
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
