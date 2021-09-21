import axios from 'axios';
import { useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { axiosInstance } from '../utils';
import pluginId from '../pluginId';

const endpoint = `/${pluginId}`;

const uploadAsset = (file, cancelToken) => {
  console.log('lol', cancelToken);
  const formData = new FormData();

  formData.append('files', file);
  formData.append('fileInfo', JSON.stringify(file));

  return axiosInstance({
    method: 'post',
    url: endpoint,
    headers: {},
    data: formData,
    cancelToken: cancelToken.token,
  }).then((res) => res.data);
};

export const useUpload = () => {
  const queryClient = useQueryClient();
  const tokenRef = useRef(axios.CancelToken.source());

  const mutationRef = useRef(
    useMutation((asset) => uploadAsset(asset, tokenRef.current), {
      onSuccess: (assets) => {
        // Coupled with the cache of useAssets
        queryClient.setQueryData('assets', (cachedAssets) => cachedAssets.concat(assets));
      },
    })
  );

  const upload = useCallback((asset) => mutationRef.current.mutate(asset), []);
  const cancel = useCallback(() => tokenRef.current.cancel(), []);

  return { upload, cancel, ...mutationRef.current };
};
