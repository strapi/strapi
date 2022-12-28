import { axiosInstance } from '../../../../../../core/utils';

const fetchData = async () => {
  const {
    data: { results },
  } = await axiosInstance.get(`/admin/audit-logs`);

  return results;
};

export { fetchData };
