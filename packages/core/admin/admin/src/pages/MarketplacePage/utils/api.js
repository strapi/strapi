import { axiosInstance } from '../../../core/utils';

const fetchAppInformation = async () => {
  const { data } = await axiosInstance.get('/admin/information');

  return data;
};

export { fetchAppInformation };
