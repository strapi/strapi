import { useMutation, useQueryClient } from 'react-query';
import { useNotification } from '@strapi/helper-plugin';

import pluginId from '../pluginId';
import { deleteRequest } from '../utils/deleteRequest';

export const useRemoveFolder = () => {
  const toggleNotification = useNotification();
  const queryClient = useQueryClient();

  const mutation = useMutation(id => deleteRequest('folders', id), {
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

  const removeFolder = id => mutation.mutate(id);

  return { ...mutation, removeFolder };
};
