import { useMutation, useQueryClient } from 'react-query';
import { useNotification } from '@strapi/helper-plugin';
import { axiosInstance } from '../utils';

const removeAssetRequest = assetId => {
  const endpoint = `/upload/files/${assetId}`;

  return axiosInstance({
    method: 'delete',
    url: endpoint,
    headers: {},
  });
};

export const useRemoveAsset = onSuccess => {
  const toggleNotification = useNotification();
  const queryClient = useQueryClient();

  const mutation = useMutation(assetId => removeAssetRequest(assetId), {
    onSuccess: ({ data }) => {
      // Coupled with the cache of useAssets
      queryClient.setQueryData('assets', (cachedAssets = []) =>
        cachedAssets.filter(asset => asset.id !== data.id)
      );

      toggleNotification({
        type: 'success',
        message: {
          id: 'modal.remove.success-label',
          defaultMessage: 'The asset has been successfully removed.',
        },
      });

      onSuccess();
    },
    onError: error => {
      toggleNotification({ type: 'warning', message: error.message });
    },
  });

  const removeAsset = assetId => mutation.mutate(assetId);

  return { ...mutation, removeAsset };
};
