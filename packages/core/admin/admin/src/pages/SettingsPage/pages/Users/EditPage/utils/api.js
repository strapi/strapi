import { axiosInstance } from '../../../../../../core/utils';

const fetchUser = async (id) => {
  const { data } = await axiosInstance.get(`/admin/users/${id}`);

  return data.data;
};

const putUser = async (id, body) => {
  const { data } = await axiosInstance.put(`/admin/users/${id}`, body);

  return data.data;
};

export { fetchUser, putUser };
