import { axiosInstance } from '../../../../../../core/utils';

const fetchAuditLogsPage = async () => {
  const {
    data: { results },
  } = await axiosInstance.get(`/admin/audit-logs?pageSize=30`);

  return results;
};

const fetchAuditLog = async (id) => {
  const { data } = await axiosInstance.get(`/admin/audit-logs/${id}`);

  return data;
};

export { fetchAuditLogsPage, fetchAuditLog };
