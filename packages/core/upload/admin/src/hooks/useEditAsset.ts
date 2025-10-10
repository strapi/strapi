import * as React from 'react';

import { useNotification, useFetchClient, FetchClient } from '@strapi/admin/strapi-admin';
import { useIntl } from 'react-intl';
import { useMutation, useQueryClient } from 'react-query';

import { UpdateFile, File as FileAsset } from '../../../shared/contracts/files';
import { pluginId } from '../pluginId';
import { getTrad } from '../utils';

export type ErrorMutation = {
  message: string;
  response: {
    status: number;
    data: {
      error: Error;
    };
  };
} | null;

const editAssetRequest = (
  asset: FileAsset,
  file: File,
  signal: AbortSignal,
  onProgress: (progress: number) => void,
  post: FetchClient['post']
) => {
  const endpoint = `/${pluginId}?id=${asset.id}`;

  const formData = new FormData();

  if (file) {
    formData.append('files', file);
  }

  formData.append(
    'fileInfo',
    JSON.stringify({
      alternativeText: asset.alternativeText,
      caption: asset.caption,
      folder: asset.folder,
      name: asset.name,
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

export const useEditAsset = () => {
  const [progress, setProgress] = React.useState(0);
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const queryClient = useQueryClient();
  const abortController = new AbortController();
  const signal = abortController.signal;
  const { post } = useFetchClient();

  const mutation = useMutation<
    UpdateFile.Response['data'],
    ErrorMutation,
    { asset: FileAsset; file: File }
  >(({ asset, file }) => editAssetRequest(asset, file, signal, setProgress, post), {
    onSuccess() {
      queryClient.refetchQueries([pluginId, 'assets'], { active: true });
      queryClient.refetchQueries([pluginId, 'asset-count'], { active: true });
      queryClient.refetchQueries([pluginId, 'folders'], { active: true });
    },
    onError(reason) {
      if (reason?.response?.status === 403) {
        toggleNotification({
          type: 'info',
          message: formatMessage({ id: getTrad('permissions.not-allowed.update') }),
        });
      } else {
        toggleNotification({ type: 'danger', message: reason?.message });
      }
    },
  });

  const editAsset = (asset: FileAsset, file: File) => mutation.mutateAsync({ asset, file });

  const cancel = () => abortController.abort();

  return { ...mutation, cancel, editAsset, progress, status: mutation.status };
};
