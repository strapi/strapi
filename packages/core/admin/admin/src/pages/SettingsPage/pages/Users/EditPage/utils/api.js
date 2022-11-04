import { axiosInstance } from '../../../../../../core/utils';

const fetchUser = async (id) => {
  const { data } = await axiosInstance.get(`/admin/users/${id}`);
  console.warn(
    'Deprecation warning: Usage of "axiosInstance" utility is deprecated. This is discouraged and will be removed in the next major release. Please use instead the useFetchClient hook inside the helper plugin and its function getClient'
  );

  return data.data;
};

const putUser = async (id, body) => {
  const { data } = await axiosInstance.put(`/admin/users/${id}`, body);
  console.warn(
    'Deprecation warning: Usage of "axiosInstance" utility is deprecated. This is discouraged and will be removed in the next major release. Please use instead the useFetchClient hook inside the helper plugin and its function putClient'
  );

  return data.data;
};

export { fetchUser, putUser };
