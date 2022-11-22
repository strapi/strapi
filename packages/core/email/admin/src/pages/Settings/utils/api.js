import { getFetchClient } from '@strapi/admin/admin/src/utils/getFetchClient';
import axiosInstance from '../../../utils/axiosInstance';

const fetchEmailSettings = async () => {
  // TODO: it is just an example of using the new getFetchClient
  const { get } = getFetchClient();
  const { data } = await get('/email/settings');

  return data.config;
};

const postEmailTest = async (body) => {
  await axiosInstance.post('/email/test', body);
};

export { fetchEmailSettings, postEmailTest };
