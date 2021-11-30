import axiosInstance from './axiosInstance';

export const removeAssetRequest = assetId => {
  const endpoint = `/upload/files/${assetId}`;

  return axiosInstance({
    method: 'delete',
    url: endpoint,
    headers: {},
  });
};
