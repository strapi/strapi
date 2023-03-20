import axios from 'axios';
import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { useIntl } from 'react-intl';
import { useFetchClient } from '@strapi/helper-plugin';

import { getTrad } from '../utils';
import pluginId from '../pluginId';

const endpoint = `/${pluginId}`;

const uploadAsset = (asset, folderId, cancelToken, onProgress, post) => {
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

  return post(endpoint, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    cancelToken: cancelToken.token,
    onUploadProgress({ total, loaded }) {
      onProgress((loaded / total) * 100);
    },
  }).then((res) => res.data);
};

export const useUpload = () => {
  const [progress, setProgress] = useState(0);
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  const tokenRef = useRef(axios.CancelToken.source());
  const { post } = useFetchClient();

  const mutation = useMutation(
    ({ asset, folderId }) => {
      return uploadAsset(asset, folderId, tokenRef.current, setProgress, post);
    },
    {
      onSuccess() {
        queryClient.refetchQueries([pluginId, 'assets'], { active: true });
        queryClient.refetchQueries([pluginId, 'asset-count'], { active: true });
      },
    }
  );

  const upload = (asset, folderId) => mutation.mutateAsync({ asset, folderId });

  const cancel = () =>
    tokenRef.current.cancel(
      formatMessage({ id: getTrad('modal.upload.cancelled'), defaultMessage: '' })
    );

  return {
    upload,
    cancel,
    error: mutation.error,
    progress,
    status: mutation.status,
  };
};
