import { axiosInstance } from '../../../../core/utils';

const fetchData = async search => {
  const {
    data: { data },
  } = await axiosInstance.get(`/admin/users${search}`);

  return data;
};

const deleteData = async ids => {
  await axiosInstance.post('/admin/users/batch-delete', { ids });
};

export { deleteData, fetchData };
