import { useMutation, useQueryClient } from 'react-query';
import { useNotification } from '@strapi/helper-plugin';

import pluginId from '../pluginId';
import { axiosInstance, getRequestUrl } from '../utils';

const editFolderRequest = folder => {
  const method = folder?.id ? 'put' : 'post';
  const url = getRequestUrl('folders');

  return axiosInstance[method](url, folder).then(res => res.data);
};

export const useEditFolder = () => {
  const toggleNotification = useNotification();
  const queryClient = useQueryClient();

  const mutation = useMutation(({ folder }) => editFolderRequest(folder), {
    onSuccess: () => {
      queryClient.refetchQueries([pluginId, 'folder'], { active: true });
      queryClient.refetchQueries([pluginId, 'folder', 'structure'], { active: true });
    },
    onError: reason => {
      toggleNotification({ type: 'warning', message: reason.message });
    },
  });

  const editFolder = folder => mutation.mutateAsync({ folder });

  return { ...mutation, editFolder, status: mutation.status };
};
