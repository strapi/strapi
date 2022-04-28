import { useMutation, useQueryClient } from 'react-query';
import { useNotification } from '@strapi/helper-plugin';

import pluginId from '../pluginId';
import { deleteRequest } from '../utils/deleteRequest';

export const useBulkRemove = type => {
  const toggleNotification = useNotification();
  const queryClient = useQueryClient();

  const bulkRemoveQuery = ids => {
    const promises = ids.map(id => deleteRequest('files', id));

    return Promise.all(promises);
  };

  const mutation = useMutation(bulkRemoveQuery, {
    onSuccess: () => {
      if (type === 'folders') {
        queryClient.refetchQueries([pluginId, 'folders'], { active: true });
      } else if (type === 'assets') {
        queryClient.refetchQueries([pluginId, 'assets'], { active: true });
        queryClient.refetchQueries([pluginId, 'asset-count'], { active: true });
      }

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

  const remove = (...args) => mutation.mutateAsync(...args);

  return { ...mutation, remove };
};
