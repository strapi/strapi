import { useFetchClient, FetchClient } from '@strapi/admin/strapi-admin';
import { useMutation, useQueryClient } from 'react-query';

import { CreateFolders, UpdateFolder } from '../../../shared/contracts/folders';
import { pluginId } from '../pluginId';

interface EditFolderRequestParams {
  attrs: CreateFolders.Request['body'] | UpdateFolder.Request['body'];
  id?: UpdateFolder.Request['params']['id'];
}

const editFolderRequest = (
  put: FetchClient['put'],
  post: FetchClient['post'],
  { attrs, id }: EditFolderRequestParams
): Promise<UpdateFolder.Response['data'] | CreateFolders.Response['data']> => {
  const isEditing = !!id;
  const method = isEditing ? put : post;

  return method(`/upload/folders/${id ?? ''}`, attrs).then((res) => res.data);
};

export const useEditFolder = () => {
  const queryClient = useQueryClient();
  const { put, post } = useFetchClient();

  const mutation = useMutation<
    UpdateFolder.Response['data'] | CreateFolders.Response['data'],
    UpdateFolder.Response['error'] | CreateFolders.Response['error'],
    EditFolderRequestParams
  >((...args) => editFolderRequest(put, post, ...args), {
    async onSuccess() {
      await queryClient.refetchQueries([pluginId, 'folders'], { active: true });
      await queryClient.refetchQueries([pluginId, 'folder', 'structure'], { active: true });
    },
  });

  const editFolder = (
    attrs: EditFolderRequestParams['attrs'],
    id?: EditFolderRequestParams['id']
  ) => mutation.mutateAsync({ attrs, id });

  return { ...mutation, editFolder, status: mutation.status };
};
