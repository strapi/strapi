import { axiosInstance } from '../../../../core/utils';

const fetchUser = async id => {
  const { data } = await axiosInstance.get(`/admin/users/${id}`);

  return data.data;
};

export default fetchUser;
