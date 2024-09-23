import { useState } from 'react';

import { useFetchClient } from '@strapi/admin/strapi-admin';
import { useMutation, useQueryClient } from 'react-query';

import pluginId from '../pluginId';

const endpoint = `/${pluginId}`;

const uploadAsset = (asset, folderId, signal, onProgress, post) => {
  const { rawFile, caption, name, alternativeText } = asset;
  const formData = new FormData();

  formData.append('files', rawFile);

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
  const [progress, setProgress] = useState(0);
  const queryClient = useQueryClient();
  const abortController = new AbortController();
  const signal = abortController.signal;
  const { post } = useFetchClient();

  const mutation = useMutation(
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

  const upload = (asset, folderId) => mutation.mutateAsync({ asset, folderId });

  const cancel = () => abortController.abort();

  return {
    upload,
    cancel,
    error: mutation.error,
    progress,
    status: mutation.status,
  };
};
