import { useMutation, useQueryClient } from 'react-query';
import { useNotification } from '@strapi/helper-plugin';

import pluginId from '../pluginId';
import { axiosInstance, getRequestUrl } from '../utils';

const editFolderRequest = ({ attrs, id }) => {
  const isEditing = !!id;
  const method = isEditing ? 'put' : 'post';
  const url = getRequestUrl(`folders/${id ?? ''}`);

  return axiosInstance[method](url, attrs).then(res => res.data);
};

export const useEditFolder = () => {
  const toggleNotification = useNotification();
  const queryClient = useQueryClient();

  const mutation = useMutation((...args) => editFolderRequest(...args), {
    onSuccess: () => {
      queryClient.refetchQueries([pluginId, 'folders'], { active: true });
      queryClient.refetchQueries([pluginId, 'folder', 'structure'], { active: true });
    },
    onError: reason => {
      toggleNotification({ type: 'warning', message: reason.message });
    },
  });

  const editFolder = (attrs, id) => mutation.mutateAsync({ attrs, id });

  return { ...mutation, editFolder, status: mutation.status };
};
