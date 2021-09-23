import { axiosInstance } from '../../../core/utils';

const fetchUser = async () => {
  const { data } = await axiosInstance.get('/admin/users/me');

  return data.data;
};

const putUser = async body => {
  const { data } = await axiosInstance.put('/admin/users/me', body);

  return data.data;
};

export { fetchUser, putUser };
