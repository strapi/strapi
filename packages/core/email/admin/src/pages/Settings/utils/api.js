import { axiosInstance } from '../../../../../../admin/admin/src/core/utils';

const fetchEmailSettings = async () => {
  const { data } = await axiosInstance.get('/email/settings');

  return data.config;
};

const postEmailTest = async body => {
  await axiosInstance.post('/email/test', body);
};

export { fetchEmailSettings, postEmailTest };
