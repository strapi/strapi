import { useQuery } from 'react-query';
import { useNotification } from '@strapi/helper-plugin';
import { axiosInstance, getRequestUrl } from '../utils';

export const useAssetCount = () => {
  const toggleNotification = useNotification();
  const dataRequestURL = getRequestUrl('files');

  const getAssetCount = async () => {
    const { data } = await axiosInstance.get(`${dataRequestURL}/count`);

    return data;
  };

  const { data, error, isLoading } = useQuery(`asset-count`, getAssetCount, {
    onError() {
      toggleNotification({
        type: 'warning',
        message: { id: 'notification.error' },
      });
    },
  });

  return { data, error, isLoading };
};
