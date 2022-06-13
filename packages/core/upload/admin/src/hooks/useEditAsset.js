import axios from 'axios';
import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { useIntl } from 'react-intl';
import { useNotification } from '@strapi/helper-plugin';

import { axiosInstance, getTrad } from '../utils';
import pluginId from '../pluginId';

const editAssetRequest = (asset, file, cancelToken, onProgress) => {
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

  return axiosInstance({
    method: 'post',
    url: endpoint,
    data: formData,
    cancelToken: cancelToken.token,
    onUploadProgress({ total, loaded }) {
      onProgress((loaded / total) * 100);
    },
  }).then(res => res.data);
};

export const useEditAsset = () => {
  const [progress, setProgress] = useState(0);
  const { formatMessage } = useIntl();
  const toggleNotification = useNotification();
  const queryClient = useQueryClient();
  const tokenRef = useRef(axios.CancelToken.source());

  const mutation = useMutation(
    ({ asset, file }) => editAssetRequest(asset, file, tokenRef.current, setProgress),
    {
      onSuccess: () => {
        queryClient.refetchQueries([pluginId, 'assets'], { active: true });
        queryClient.refetchQueries([pluginId, 'asset-count'], { active: true });
        queryClient.refetchQueries([pluginId, 'folders'], { active: true });
      },
      onError: reason => {
        if (reason.response.status === 403) {
          toggleNotification({
            type: 'info',
            message: { id: getTrad('permissions.not-allowed.update') },
          });
        } else {
          toggleNotification({ type: 'warning', message: reason.message });
        }
      },
    }
  );

  const editAsset = (asset, file) => mutation.mutateAsync({ asset, file });

  const cancel = () =>
    tokenRef.current.cancel(
      formatMessage({ id: getTrad('modal.upload.cancelled'), defaultMessage: '' })
    );

  return { ...mutation, cancel, editAsset, progress, status: mutation.status };
};
