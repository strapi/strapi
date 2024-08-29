import * as React from 'react';

import { useFetchClient } from '@strapi/admin/strapi-admin';
import { useMutation, useQueryClient } from 'react-query';
import { CreateFile } from '../../../shared/contracts/files';
import type { Asset, AssetEnriched } from '../../../shared/contracts/files';
import type { Data } from '@strapi/types';

import pluginId from '../pluginId';

const endpoint = `/${pluginId}`;

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

export type ErrorMutation = {
  response: {
    data: {
      error: Error;
    };
  };
} | null;

type PostType = <TData = any, TSend = any>(
  url: string,
  data?: TSend,
  config?: FetchOptions
) => Promise<FetchResponse<TData>>;

const uploadAsset = (
  asset: AssetEnriched,
  folderId: Data.ID | null,
  signal: AbortSignal,
  onProgress: (progress: number) => void,
  post: PostType
) => {
  const { rawFile, caption, name, alternativeText } = asset;
  const formData = new FormData();

  if (rawFile) {
    formData.append('files', rawFile);
  }

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
  }).then((res: CreateFile.Response) => res.data);
};

export const useUpload = () => {
  const [progress, setProgress] = React.useState(0);
  const queryClient = useQueryClient();
  const abortController = new AbortController();
  const signal = abortController.signal;
  const {
    post,
  }: {
    post: PostType;
  } = useFetchClient();

  const mutation = useMutation<
    Asset[],
    ErrorMutation,
    { asset: AssetEnriched; folderId: Data.ID | null }
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

  const upload = (asset: AssetEnriched, folderId: Data.ID | null) =>
    mutation.mutateAsync({ asset, folderId });

  const cancel = () => abortController.abort();

  return {
    upload,
    cancel,
    isLoading: mutation.isLoading,
    error: mutation.error,
    progress,
    status: mutation.status,
  };
};
