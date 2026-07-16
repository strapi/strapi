import * as React from 'react';

import { adminApi } from '@strapi/admin/strapi-admin';
import { useMutation, useQueryClient } from 'react-query';
import { useDispatch, useStore } from 'react-redux';

import { File, RawFile, CreateFile } from '../../../shared/contracts/files';
import { uploadFileViaXHR } from '../future/services/uploadFileViaXHR';
import { pluginId } from '../pluginId';

const endpoint = `/${pluginId}`;

interface Asset extends Omit<File, 'id' | 'hash'> {
  rawFile?: RawFile;
  id?: File['id'];
  hash?: File['hash'];
}

interface StoreState {
  admin_app: {
    token?: string | null;
  };
}

const uploadAssets = (
  assets: Asset | Asset[],
  folderId: number | null,
  signal: AbortSignal,
  onProgress: (progress: number) => void,
  token: string | null | undefined
): Promise<CreateFile.Response['data']> => {
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
   * Native fetch cannot report upload progress, so upload via the shared XHR
   * service and surface its byte-level progress as a 0-100 percentage.
   */
  return uploadFileViaXHR<CreateFile.Response['data']>(
    `${window.strapi.backendURL}${endpoint}`,
    token,
    formData,
    signal,
    (loaded, total) => {
      if (total > 0) {
        onProgress(Math.round((loaded / total) * 100));
      }
    }
  );
};

export const useUpload = () => {
  const dispatch = useDispatch();
  const [progress, setProgress] = React.useState(0);
  const queryClient = useQueryClient();
  const abortController = new AbortController();
  const signal = abortController.signal;
  const store = useStore<StoreState>();

  const mutation = useMutation<
    CreateFile.Response['data'],
    CreateFile.Response['error'],
    { assets: Asset | Asset[]; folderId: number | null }
  >(
    ({ assets, folderId }) => {
      return uploadAssets(assets, folderId, signal, setProgress, store.getState().admin_app?.token);
    },
    {
      onSuccess() {
        queryClient.refetchQueries([pluginId, 'assets'], { active: true });
        queryClient.refetchQueries([pluginId, 'asset-count'], { active: true });
        dispatch(adminApi.util.invalidateTags(['HomepageKeyStatistics', 'AiUsage']));
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
