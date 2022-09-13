import axiosInstance from '../../../utils/axiosInstance';

const fetchEmailSettings = async () => {
  const { data } = await axiosInstance.get('/email/settings');

  return data.config;
};

const postEmailTest = async (body) => {
  await axiosInstance.post('/email/test', body);
};

export { fetchEmailSettings, postEmailTest };
