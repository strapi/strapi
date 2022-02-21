import { axiosInstance } from '../../../core/utils';

const fetchInstalledPlugins = async notify => {
  const { data } = await axiosInstance.get('/admin/plugins');

  notify();

  return data;
};

export { fetchInstalledPlugins };
