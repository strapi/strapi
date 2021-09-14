import { axiosInstance } from '../../../../../../core/utils';

const fetchData = async (search, notify) => {
  const {
    data: { data },
  } = await axiosInstance.get(`/admin/users${search}`);

  notify();

  return data;
};

const deleteData = async ids => {
  await axiosInstance.post('/admin/users/batch-delete', { ids });
};

export { deleteData, fetchData };
