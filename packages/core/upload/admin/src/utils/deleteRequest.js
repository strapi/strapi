import axiosInstance from './axiosInstance';
import getRequestUrl from './getRequestUrl';

export const deleteRequest = (type, id) => {
  const url = getRequestUrl(`/${type}/${id}`);

  console.warn(
    'Deprecation warning: Usage of "axiosInstance" utility is deprecated. This is discouraged and will be removed in the next major release. Please use instead the useFetchClient hook inside the helper plugin and its function deleteClient'
  );

  return axiosInstance.delete(url);
};
