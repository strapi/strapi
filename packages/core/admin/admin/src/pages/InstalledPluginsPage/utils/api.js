import { axiosInstance } from '../../../core/utils';

const fetchPlugins = async notify => {
  const { data } = await axiosInstance.get('/admin/plugins');

  notify();

  return data;
};

export { fetchPlugins };
