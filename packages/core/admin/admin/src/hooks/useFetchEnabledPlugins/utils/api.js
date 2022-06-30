import { axiosInstance } from '../../../core/utils';

const fetchEnabledPlugins = async () => {
  const { data } = await axiosInstance.get('/admin/plugins');

  return data;
};

export { fetchEnabledPlugins };
