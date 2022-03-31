import { useMutation, useQueryClient } from 'react-query';
import { useNotification } from '@strapi/helper-plugin';

import pluginId from '../pluginId';
import { removeAssetRequest } from '../utils/removeAssetQuery';

const bulkRemoveQuery = folderIDs => {
  const promises = folderIDs.map(folderID => removeAssetRequest(folderID));

  return Promise.all(promises);
};

export const useBulkRemoveFolder = () => {
  const toggleNotification = useNotification();
  const queryClient = useQueryClient();

  const mutation = useMutation(bulkRemoveQuery, {
    onSuccess: () => {
      queryClient.refetchQueries([pluginId, 'folders'], { active: true });

      toggleNotification({
        type: 'success',
        message: {
          id: 'modal.remove.success-label',
          defaultMessage: 'The folder has been successfully removed.',
        },
      });
    },
    onError: error => {
      toggleNotification({ type: 'warning', message: error.message });
    },
  });

  const removeFolders = folderIDs => mutation.mutateAsync(folderIDs);

  return { ...mutation, removeFolders };
};
