import { useMutation, useQueryClient } from 'react-query';
import { useNotification } from '@strapi/helper-plugin';
import { removeAssetRequest } from '../utils/removeAssetQuery';

const bulkRemoveQuery = assetIds => {
  const promises = assetIds.map(assetId => removeAssetRequest(assetId));

  return Promise.all(promises);
};

export const useBulkRemoveAsset = () => {
  const toggleNotification = useNotification();
  const queryClient = useQueryClient();

  const mutation = useMutation(bulkRemoveQuery, {
    onSuccess: () => {
      // Coupled with the cache of useAssets
      queryClient.refetchQueries(['assets'], { active: true });
      queryClient.refetchQueries(['asset-count'], { active: true });

      toggleNotification({
        type: 'success',
        message: {
          id: 'modal.remove.success-label',
          defaultMessage: 'The asset has been successfully removed.',
        },
      });
    },
    onError: error => {
      toggleNotification({ type: 'warning', message: error.message });
    },
  });

  const removeAssets = assetIds => mutation.mutateAsync(assetIds);

  return { ...mutation, removeAssets };
};
