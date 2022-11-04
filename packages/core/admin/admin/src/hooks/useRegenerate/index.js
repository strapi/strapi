import { useState } from 'react';
import { get } from 'lodash';
import { useNotification } from '@strapi/helper-plugin';
import { axiosInstance } from '../../core/utils';

const useRegenerate = (id, onRegenerate) => {
  const [isLoadingConfirmation, setIsLoadingConfirmation] = useState(false);
  const toggleNotification = useNotification();

  const regenerateData = async () => {
    try {
      const {
        data: {
          data: { accessKey },
        },
      } = await axiosInstance.post(`/admin/api-tokens/${id}/regenerate`);
      console.warn(
        'Deprecation warning: Usage of "axiosInstance" utility is deprecated. This is discouraged and will be removed in the next major release. Please use instead the useFetchClient hook inside the helper plugin and its function postClient'
      );
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
