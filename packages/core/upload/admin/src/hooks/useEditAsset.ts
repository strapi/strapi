import { useState } from 'react';

import { useNotification, useFetchClient } from '@strapi/admin/strapi-admin';
import { useIntl } from 'react-intl';
import { useMutation, useQueryClient } from 'react-query';
import { UpdateFile } from '../../../shared/contracts/files';
import type { Asset } from '../../../shared/contracts/files';
import type { RawFile } from '../types';

import pluginId from '../pluginId';
// TODO: replace it with the import from the index file when it will be migrated to typescript
import { getTrad } from '../utils/getTrad';
import { Data } from '@strapi/types';

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

type PostType = <TData = any, TSend = any>(
  url: string,
  data?: TSend,
  config?: FetchOptions
) => Promise<FetchResponse<TData>>;

interface AssetProps extends Omit<Asset, 'folder'> {
  type?: string;
  isSelectable?: boolean;
  isLocal?: boolean;
  allowedTypes?: string[];
  rawFile?: RawFile;
  folder?: Data.ID;
}

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
  asset: AssetProps,
  file: File,
  signal: AbortSignal,
  onProgress: (progress: number) => void,
  post: PostType
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
  }).then((res: UpdateFile.Response) => res.data);
};

export const useEditAsset = () => {
  const [progress, setProgress] = useState(0);
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const queryClient = useQueryClient();
  const abortController = new AbortController();
  const signal = abortController.signal;
  const {
    post,
  }: {
    post: PostType;
  } = useFetchClient();

  const mutation = useMutation<
    Asset,
    ErrorMutation,
    {
      asset: AssetProps;
      file: File;
    }
  >(({ asset, file }) => editAssetRequest(asset, file, signal, setProgress, post), {
    onSuccess() {
      queryClient.refetchQueries([pluginId, 'assets'], { active: true });
      queryClient.refetchQueries([pluginId, 'asset-count'], { active: true });
      queryClient.refetchQueries([pluginId, 'folders'], { active: true });
    },
    onError(reason) {
      if (reason?.response.status === 403) {
        toggleNotification({
          type: 'info',
          message: formatMessage({ id: getTrad('permissions.not-allowed.update') }),
        });
      } else {
        toggleNotification({ type: 'danger', message: reason?.message });
      }
    },
  });

  const editAsset = (asset: AssetProps, file: File) => mutation.mutateAsync({ asset, file });

  const cancel = () => abortController.abort();

  return { ...mutation, cancel, editAsset, progress, status: mutation.status };
};
