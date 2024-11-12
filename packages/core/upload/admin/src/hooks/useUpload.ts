import * as React from 'react';

import { useFetchClient, FetchClient } from '@strapi/admin/strapi-admin';
import { useMutation, useQueryClient } from 'react-query';

import { File, RawFile, CreateFile } from '../../../shared/contracts/files';
import { pluginId } from '../pluginId';

const endpoint = `/${pluginId}`;

interface Asset extends Omit<File, 'id' | 'hash'> {
  rawFile?: RawFile;
  id?: File['id'];
  hash?: File['hash'];
}

const uploadAsset = (
  asset: Asset,
  folderId: number | null,
  signal: AbortSignal,
  onProgress: (progress: number) => void,
  post: FetchClient['post']
) => {
  const { rawFile, caption, name, alternativeText } = asset;
  const formData = new FormData();

  formData.append('files', rawFile!);

  formData.append(
    'fileInfo',
    JSON.stringify({
      name,
      caption,
      alternativeText,
      folder: folderId,
    })
  );

  /**
   * onProgress is not possible using native fetch
   * need to look into an alternative to make it work
   * perhaps using xhr like Axios does
   */
  return post(endpoint, formData, {
    signal,
  }).then((res) => res.data);
};

export const useUpload = () => {
  const [progress, setProgress] = React.useState(0);
  const queryClient = useQueryClient();
  const abortController = new AbortController();
  const signal = abortController.signal;
  const { post } = useFetchClient();

  const mutation = useMutation<
    CreateFile.Response['data'],
    CreateFile.Response['error'],
    { asset: Asset; folderId: number | null }
  >(
    ({ asset, folderId }) => {
      return uploadAsset(asset, folderId, signal, setProgress, post);
    },
    {
      onSuccess() {
        queryClient.refetchQueries([pluginId, 'assets'], { active: true });
        queryClient.refetchQueries([pluginId, 'asset-count'], { active: true });
      },
    }
  );

  const upload = (asset: Asset, folderId: number | null) =>
    mutation.mutateAsync({ asset, folderId });

  const cancel = () => abortController.abort();

  return {
    upload,
    isLoading: mutation.isLoading,
    cancel,
    error: mutation.error,
    progress,
    status: mutation.status,
  };
};
