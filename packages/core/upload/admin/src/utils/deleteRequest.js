import axiosInstance from './axiosInstance';
import getRequestUrl from './getRequestUrl';

export const deleteRequest = (type, id) => {
  const url = getRequestUrl(`/${type}/${id}`);

  return axiosInstance.delete(url);
};
