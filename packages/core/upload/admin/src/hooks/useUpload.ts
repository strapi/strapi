import { useState } from 'react';

import { useFetchClient } from '@strapi/admin/strapi-admin';
import { useMutation, useQueryClient } from 'react-query';
import { CreateFile } from '../../../shared/contracts/files';
import type { Asset } from '../../../shared/contracts/files';
import type { Data } from '@strapi/types';

import pluginId from '../pluginId';

const endpoint = `/${pluginId}`;

interface RawFile extends Blob {
  size: number;
  lastModified: number;
  name: string;
  type: string;
}

export interface AssetProps extends Asset {
  type?: string;
  isSelectable?: boolean;
  isLocal?: boolean;
  allowedTypes?: string[];
  rawFile: RawFile;
}

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
  asset: AssetProps,
  folderId: Data.ID | null,
  signal: AbortSignal,
  onProgress: (progress: number) => void,
  post: PostType
) => {
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
  }).then((res: CreateFile.Response) => res.data);
};

export const useUpload = () => {
  const [progress, setProgress] = useState(0);
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
    { asset: AssetProps; folderId: Data.ID | null }
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

  const upload = (asset: AssetProps, folderId: Data.ID | null) =>
    mutation.mutateAsync({ asset, folderId });

  const cancel = () => abortController.abort();

  return {
    upload,
    cancel,
    error: mutation.error,
    progress,
    status: mutation.status,
  };
};
