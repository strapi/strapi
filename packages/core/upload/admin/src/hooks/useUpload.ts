import * as React from 'react';

import { useFetchClient, FetchClient, adminApi } from '@strapi/admin/strapi-admin';
import { useMutation, useQueryClient } from 'react-query';
import { useDispatch } from 'react-redux';

import { File, RawFile, CreateFile } from '../../../shared/contracts/files';
import { pluginId } from '../pluginId';

const endpoint = `/${pluginId}`;

interface Asset extends Omit<File, 'id' | 'hash'> {
  rawFile?: RawFile;
  id?: File['id'];
  hash?: File['hash'];
}

const uploadAssets = (
  assets: Asset | Asset[],
  folderId: number | null,
  signal: AbortSignal,
  onProgress: (progress: number) => void,
  post: FetchClient['post']
) => {
  const assetsArray = Array.isArray(assets) ? assets : [assets];
  const formData = new FormData();

  // Add all files to the form data
  assetsArray.forEach((asset) => {
    if (asset.rawFile) {
      formData.append('files', asset.rawFile);
    }
  });

  // Add each fileInfo as a separate stringified field
  assetsArray.forEach((asset) => {
    formData.append(
      'fileInfo',
      JSON.stringify({
        name: asset.name,
        caption: asset.caption,
        alternativeText: asset.alternativeText,
        folder: folderId,
      })
    );
  });

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
  const dispatch = useDispatch();
  const [progress, setProgress] = React.useState(0);
  const queryClient = useQueryClient();
  const abortController = new AbortController();
  const signal = abortController.signal;
  const { post } = useFetchClient();

  const mutation = useMutation<
    CreateFile.Response['data'],
    CreateFile.Response['error'],
    { assets: Asset | Asset[]; folderId: number | null }
  >(
    ({ assets, folderId }) => {
      return uploadAssets(assets, folderId, signal, setProgress, post);
    },
    {
      onSuccess() {
        queryClient.refetchQueries([pluginId, 'assets'], { active: true });
        queryClient.refetchQueries([pluginId, 'asset-count'], { active: true });
        dispatch(adminApi.util.invalidateTags(['HomepageKeyStatistics', 'AIUsage']));
      },
    }
  );

  const upload = (assets: Asset | Asset[], folderId: number | null) =>
    mutation.mutateAsync({ assets, folderId });

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
