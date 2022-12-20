import { useState } from 'react';
import { get } from 'lodash';
import { useNotification } from '@strapi/helper-plugin';
import { getFetchClient } from '../../utils/getFetchClient';

const useRegenerate = (id, onRegenerate) => {
  const [isLoadingConfirmation, setIsLoadingConfirmation] = useState(false);
  const toggleNotification = useNotification();
  const { post } = getFetchClient();

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
