import axios from 'axios';
import { useMutation, useQueryClient } from 'react-query';
import { axiosInstance } from '../utils';
import pluginId from '../pluginId';

const endpoint = `/${pluginId}`;

const uploadAssets = async cancellableAssets => {
  const requests = cancellableAssets.map(({ rawFile, cancelToken }) => {
    const formData = new FormData();

    formData.append('files', rawFile);
    formData.append('fileInfo', JSON.stringify(rawFile));

    return axiosInstance({
      method: 'post',
      url: endpoint,
      cancelToken,
      headers: {},
      data: formData,
    });
  });

  return Promise.allSettled(requests);
};

export const useUpload = (assets, onSuccess) => {
  const queryClient = useQueryClient();
  const cancellableAssets = assets.map(asset => ({
    ...asset,
    cancelToken: axios.CancelToken.source().token,
  }));

  const mutation = useMutation(uploadAssets, {
    onSuccess: res => {
      const assets = res
        .map(assetResponse => assetResponse.value.data)
        .reduce((acc, curr) => acc.concat(curr), []);

      // Coupled with the cache of useAssets
      queryClient.setQueryData('assets', cachedAssets => cachedAssets.concat(assets));

      onSuccess();
    },
  });

  const cancel = index => {
    cancellableAssets[index].cancelToken.cancel('Operation canceled by the user.');
  };

  const upload = () => mutation.mutate(cancellableAssets);

  return { upload, cancel, isError: mutation.isError, isLoading: mutation.isLoading };
};
