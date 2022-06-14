import { useMutation, useQueryClient } from 'react-query';
import { useNotification } from '@strapi/helper-plugin';

import { deleteRequest } from '../utils/deleteRequest';
import pluginId from '../pluginId';

export const useRemoveAsset = onSuccess => {
  const toggleNotification = useNotification();
  const queryClient = useQueryClient();

  const mutation = useMutation(assetId => deleteRequest('files', assetId), {
    onSuccess: () => {
      queryClient.refetchQueries([pluginId, 'assets'], { active: true });
      queryClient.refetchQueries([pluginId, 'asset-count'], { active: true });

      toggleNotification({
        type: 'success',
        message: {
          id: 'modal.remove.success-label',
          defaultMessage: 'Elements have been successfully deleted.',
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
