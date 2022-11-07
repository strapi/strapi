import { axiosInstance } from '../../../../../../core/utils';

const fetchData = async (search, notify) => {
  console.warn(
    'Deprecation warning: Usage of "axiosInstance" utility is deprecated. This is discouraged and will be removed in the next major release. Please use instead the useFetchClient hook inside the helper plugin and its function getClient'
  );
  const {
    data: { data },
  } = await axiosInstance.get(`/admin/users${search}`);

  notify();

  return data;
};

const deleteData = async (ids) => {
  console.warn(
    'Deprecation warning: Usage of "axiosInstance" utility is deprecated. This is discouraged and will be removed in the next major release. Please use instead the useFetchClient hook inside the helper plugin and its function postClient'
  );

  await axiosInstance.post('/admin/users/batch-delete', { ids });
};

export { deleteData, fetchData };
