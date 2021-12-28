import axios from 'axios';
import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { useIntl } from 'react-intl';
import { axiosInstance, getTrad } from '../utils';
import pluginId from '../pluginId';

const endpoint = `/${pluginId}`;

const uploadAsset = (asset, cancelToken, onProgress) => {
  const { rawFile, caption, name, alternativeText } = asset;
  const formData = new FormData();

  formData.append('files', rawFile);

  formData.append(
    'fileInfo',
    JSON.stringify({
      name,
      caption: caption || name,
      alternativeText: alternativeText || name,
    })
  );

  return axiosInstance({
    method: 'post',
    url: endpoint,
    headers: {},
    data: formData,
    cancelToken: cancelToken.token,
    onUploadProgress({ total, loaded }) {
      onProgress((loaded / total) * 100);
    },
  }).then(res => res.data);
};

export const useUpload = () => {
  const [progress, setProgress] = useState(0);
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  const tokenRef = useRef(axios.CancelToken.source());

  const mutation = useMutation(asset => uploadAsset(asset, tokenRef.current, setProgress), {
    onSuccess: () => {
      queryClient.refetchQueries(['assets'], { active: true });
      queryClient.refetchQueries(['asset-count'], { active: true });
    },
  });

  const upload = asset => mutation.mutateAsync(asset);
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
