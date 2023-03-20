import { getFetchClient } from '@strapi/helper-plugin';

const fetchEmailSettings = async () => {
  const { get } = getFetchClient();
  const { data } = await get('/email/settings');

  return data.config;
};

const postEmailTest = async (body) => {
  const { post } = getFetchClient();

  await post('/email/test', body);
};

export { fetchEmailSettings, postEmailTest };
