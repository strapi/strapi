import { axiosInstance } from '../../../core/utils';

const fetchInstalledPlugins = async () => {
  const { data } = await axiosInstance.get('/admin/plugins');

  return data;
};

export { fetchInstalledPlugins };
