import { useState } from 'react';
import { get } from 'lodash';
import { useNotification } from '@strapi/helper-plugin';
import { axiosInstance } from '../../core/utils';

const useRegenerate = (url, id, onRegenerate) => {
  const [isLoadingConfirmation, setIsLoadingConfirmation] = useState(false);
  const toggleNotification = useNotification();

  const regenerateData = async () => {
    try {
      const {
        data: {
          data: { accessKey },
        },
      } = await axiosInstance.post(`${url}${id}/regenerate`);
      setIsLoadingConfirmation(false);
      onRegenerate(accessKey);
    } catch (error) {
      setIsLoadingConfirmation(false);
      toggleNotification({
        type: 'warning',
        message: get(error, 'response.data.message', 'notification.error'),
      });
    }
  };

  return {
    regenerateData,
    isLoadingConfirmation,
  };
};

export default useRegenerate;
