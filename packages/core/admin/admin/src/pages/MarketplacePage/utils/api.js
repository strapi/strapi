import { axiosInstance } from '../../../core/utils';

const fetchAppInformation = async notify => {
  const { data } = await axiosInstance.get('/admin/information');

  notify();

  return data;
};

export { fetchAppInformation };
