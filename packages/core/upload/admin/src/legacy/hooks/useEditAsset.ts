import * as React from 'react';

import {
  useNotification,
  useFetchClient,
  FetchClient,
  isAbortError,
  isFetchError,
} from '@strapi/admin/strapi-admin';
import { useIntl } from 'react-intl';
import { useMutation, useQueryClient } from 'react-query';

import { UpdateFile, File as FileAsset } from '../../../../shared/contracts/files';
import { pluginId } from '../../pluginId';
import { getTrad } from '../utils';

const editAssetRequest = (
  asset: FileAsset,
  file: File,
  signal: AbortSignal,
  onProgress: (progress: number) => void,
  post: FetchClient['post']
): Promise<UpdateFile.Response['data']> => {
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
      focalPoint: asset.focalPoint,
      folder: asset.folder,
      name: asset.name,
    })
  );

  /**
   * onProgress is not possible using native fetch
   * need to look into an alternative to make it work
   * perhaps using xhr like Axios does
   */
  return post<UpdateFile.Response['data'], UpdateFile.Request['body']>(endpoint, formData, {
    signal,
  }).then((res) => res.data);
};

export const useEditAsset = () => {
  const [progress, setProgress] = React.useState(0);
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const queryClient = useQueryClient();
  const abortControllerRef = React.useRef<AbortController | null>(null);
  const { post } = useFetchClient();

  const mutation = useMutation<
    UpdateFile.Response['data'],
    Error,
    { asset: FileAsset; file: File }
  >(
    ({ asset, file }) => {
      // One controller per request, so `cancel` reaches it after the hook re-renders.
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      return editAssetRequest(asset, file, abortController.signal, setProgress, post);
    },
    {
      onSuccess() {
        queryClient.refetchQueries([pluginId, 'assets'], { active: true });
        queryClient.refetchQueries([pluginId, 'asset-count'], { active: true });
        queryClient.refetchQueries([pluginId, 'folders'], { active: true });
      },
      onError(reason) {
        if (isAbortError(reason) || abortControllerRef.current?.signal.aborted) return;

        if (isFetchError(reason) && reason.status === 403) {
          toggleNotification({
            type: 'info',
            message: formatMessage({ id: getTrad('permissions.not-allowed.update') }),
          });
        } else {
          toggleNotification({ type: 'danger', message: reason.message });
        }
      },
    }
  );

  const editAsset = (asset: FileAsset, file: File) => mutation.mutateAsync({ asset, file });

  const cancel = () => abortControllerRef.current?.abort();

  return { ...mutation, cancel, editAsset, progress, status: mutation.status };
};
