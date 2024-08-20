import { useFetchClient } from '@strapi/admin/strapi-admin';
import { useMutation, useQueryClient } from 'react-query';
import { UpdateFolder, CreateFolders } from '../../../shared/contracts/folders';

import pluginId from '../pluginId';

type FetchResponse<TData = any> = {
  data: TData;
  status?: number;
};

type FetchOptions = {
  params?: any;
  signal?: AbortSignal;
  headers?: Record<string, string>;
  validateStatus?: ((status: number) => boolean) | null;
};

type PutPostType = <TData = any, TSend = any>(
  url: string,
  data?: TSend,
  config?: FetchOptions
) => Promise<FetchResponse<TData>>;

interface EditFolderParams {
  attrs: UpdateFolder.Request['body'] | CreateFolders.Request['body'];
  id?: UpdateFolder.Request['params']['id'];
}

const editFolderRequest = async (
  put: PutPostType,
  post: PutPostType,
  { attrs, id }: EditFolderParams
): Promise<UpdateFolder.Response['data'] | CreateFolders.Response['data']> => {
  const isEditing = !!id;
  const method = isEditing ? put : post;
  const url = isEditing ? `/upload/folders/${id}` : '/upload/folders';

  const response = await method(url, attrs);
  return response.data;
};

export const useEditFolder = () => {
  const queryClient = useQueryClient();
  const { put, post } = useFetchClient();

  const mutation = useMutation<
    UpdateFolder.Response['data'] | CreateFolders.Response['data'],
    UpdateFolder.Response['error'] | CreateFolders.Response['error'],
    EditFolderParams
  >((...args) => editFolderRequest(put, post, ...args), {
    onSuccess() {
      queryClient.refetchQueries([pluginId, 'folders'], { active: true });
      queryClient.refetchQueries([pluginId, 'folder', 'structure'], { active: true });
    },
  });

  const editFolder = (attrs: EditFolderParams['attrs'], id: EditFolderParams['id']) =>
    mutation.mutateAsync({ attrs, id });

  return { ...mutation, editFolder, status: mutation.status };
};
