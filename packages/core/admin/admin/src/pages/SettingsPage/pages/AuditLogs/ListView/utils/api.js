import { axiosInstance } from '../../../../../../core/utils';

const fetchData = async () => {
  const {
    data: { results },
  } = await axiosInstance.get(`/admin/audit-logs?pageSize=30`);

  return results;
};

export { fetchData };
