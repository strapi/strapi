import { useFetchClient } from '@strapi/admin/strapi-admin';
import { useMutation, useQueryClient } from 'react-query';

import pluginId from '../pluginId';

const editFolderRequest = (put, post, { attrs, id }) => {
  const isEditing = !!id;
  const method = isEditing ? put : post;

  return method(`/upload/folders/${id ?? ''}`, attrs).then((res) => res.data);
};

export const useEditFolder = () => {
  const queryClient = useQueryClient();
  const { put, post } = useFetchClient();

  const mutation = useMutation((...args) => editFolderRequest(put, post, ...args), {
    onSuccess() {
      queryClient.refetchQueries([pluginId, 'folders'], { active: true });
      queryClient.refetchQueries([pluginId, 'folder', 'structure'], { active: true });
    },
  });

  const editFolder = (attrs, id) => mutation.mutateAsync({ attrs, id });

  return { ...mutation, editFolder, status: mutation.status };
};
