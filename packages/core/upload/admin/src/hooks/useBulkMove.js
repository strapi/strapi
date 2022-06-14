import { useMutation, useQueryClient } from 'react-query';
import { useNotification } from '@strapi/helper-plugin';

import pluginId from '../pluginId';
import { axiosInstance, getRequestUrl, getTrad } from '../utils';

export const useBulkMove = () => {
  const toggleNotification = useNotification();
  const queryClient = useQueryClient();
  const url = getRequestUrl('actions/bulk-move');

  const bulkMoveQuery = ({ destinationFolderId, filesAndFolders }) => {
    const payload = filesAndFolders.reduce((acc, selected) => {
      const { id, type } = selected;
      const key = type === 'asset' ? 'fileIds' : 'folderIds';

      if (!acc[key]) {
        acc[key] = [];
      }

      acc[key].push(id);

      return acc;
    }, {});

    return axiosInstance.post(url, { ...payload, destinationFolderId });
  };

  const mutation = useMutation(bulkMoveQuery, {
    onSuccess: res => {
      const {
        data: { data },
      } = res;

      if (data?.files?.length > 0) {
        queryClient.refetchQueries([pluginId, 'assets'], { active: true });
        queryClient.refetchQueries([pluginId, 'asset-count'], { active: true });
      }

      // folders need to be re-fetched in any case, because assets might have been
      // moved into a sub-folder and therefore the count needs to be updated
      queryClient.refetchQueries([pluginId, 'folders'], { active: true });

      toggleNotification({
        type: 'success',
        message: {
          id: getTrad('modal.move.success-label'),
          defaultMessage: 'Elements have been moved successfully.',
        },
      });
    },
    onError: error => {
      toggleNotification({ type: 'warning', message: error.message });
    },
  });

  const move = (destinationFolderId, filesAndFolders) =>
    mutation.mutateAsync({ destinationFolderId, filesAndFolders });

  return { ...mutation, move };
};
