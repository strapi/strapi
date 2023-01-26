import axiosInstance from './axiosInstance';
import getRequestUrl from './getRequestUrl';

export const deleteRequest = (type, id) => {
  const url = getRequestUrl(`/${type}/${id}`);
  console.log('deleteRequest', url);

  return axiosInstance.delete(url);
};
